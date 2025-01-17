import { Request, Response } from 'express';
import { yagnaService } from '../services/yagnaService';
import { vpnStore } from './vpnController';
import { InstanceInfo, ServiceConfig, SshKey, LaunchScript } from '../types';
import { dbService } from '../services/dbService';
import { TcpProxy, ResourceRental, NetworkNode, ExeUnit, MarketOrderSpec } from '@golem-sdk/golem-js';
import { monitorService } from '../services/monitorService';
import { getAvailablePort } from '../utils/portUtils';
import { proxyService } from '../services/proxyService';
import { ResponseHandler } from '../utils/responseHandler';
import logger from '../logger';

export const rentals: Map<string, ResourceRental> = new Map();
export const instanceProxies: Map<string, { service: ServiceConfig, proxy: TcpProxy }[]> = new Map();

interface CreateInstanceRequest {
  initConfig: {
    agreementId: string;
    instanceName: string;
    demandOptions: {
      capabilities: string[];
      imageTag: string;
    };
    orderOptions: {
      rentHours: number;
      pricing: any;
    };
    allocationId: string;
    launchScriptId?: string;
    vpnId?: string;
    services: ServiceConfig[];
  }
}

interface InstanceCleanupOptions {
  stopInstance: boolean;
  closeServices: boolean;
  deleteNode: boolean;
}

export class InstanceController {
  private static readonly INSTANCE_CREATION_TIMEOUT = Number(process.env.INSTANCE_CREATION_TIMEOUT || 300) * 1000;
  private static readonly RENTAL_STOP_TIMEOUT = Number(process.env.RENTAL_STOP_TIMEOUT || 120) * 1000;

  private handleError(res: Response, error: any, message: string) {
    logger.error(`${message}: ${error.message}`);
    res.status(202).json(ResponseHandler.failure(message, error.message));
  }

  async createInstance(req: Request<any, any, CreateInstanceRequest>, res: Response) {
    try {
      const network = (req as any).network;
      const glm = await yagnaService.getGlm(network);
      if (!glm) {
        throw new Error('Yagna not initialized');
      }
      const { initConfig } = req.body;
      const order: MarketOrderSpec = {
        demand: {
          workload: initConfig.demandOptions
        },
        market: {
          rentHours: initConfig.orderOptions.rentHours,
          pricing: initConfig.orderOptions.pricing
        },
        payment: {
          allocation: initConfig.allocationId
        },
        network: initConfig.vpnId ? vpnStore.get(initConfig.vpnId) : undefined
      }

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('No providers accepted the proposal. \nplease check the configuration validity or modify the size. \nFor example: number of threads, memory, price per hour.\nOnline providers: https://stats.golem.network/network/providers/online')), 
          InstanceController.INSTANCE_CREATION_TIMEOUT);
      });

      const createInstancePromise = async () => {
        const rental = await glm.oneOf({ order, setup: async (exe) => {
          if (initConfig.launchScriptId) {
            const launchScript = await dbService.get<LaunchScript>('launch_script', { script_id: initConfig.launchScriptId });
            if (launchScript[0].content) {
              await exe.run(`${launchScript[0].content}`);
            }
          }
        }});
        rentals.set(rental.agreement.id, rental);
        const exe = await rental.getExeUnit();
        logger.info({
          agreementId: rental.agreement.id,
          provider: exe.provider.name,
          network: network
        }, `Successfully created instance`);

        const newInstanceData: InstanceInfo = {
          name: initConfig.instanceName,
          allocation_id: initConfig.allocationId,
          agreement_id: rental.agreement.id,
          activity_id: exe.activity.id,
          provider_id: exe.provider.id,
          capabilities: initConfig.demandOptions.capabilities,
          image_tag: initConfig.demandOptions.imageTag,
          expiration: initConfig.orderOptions.rentHours * 3600 + Math.floor(Date.now() / 1000),
          vpn_id: initConfig.vpnId,
          ipv4_address: initConfig.vpnId ? exe.getIp() : '',
          services: initConfig.services,
          state: 'Active'
        };

        if (initConfig.services.length > 0) {
          const endpoint = await this.setupServices(exe, rental.agreement.id, initConfig.services);
          newInstanceData.endpoint = endpoint;
        }
        
        dbService.update('instance', initConfig.agreementId, {
          ...newInstanceData,
          configure: initConfig,
          details: 'Instance created successfully'
        });
        return newInstanceData;
      };

      const result = await Promise.race([
        createInstancePromise(),
        timeoutPromise
      ]);

      res.status(200).json(ResponseHandler.success(result));
    } catch (error: any) {
      dbService.update('instance', req.body.initConfig.agreementId, {
        state: 'CreateFailed',
        details: error.message,
        configure: req.body.initConfig
      });
      this.cleanupInstance(req.body.initConfig.agreementId);
      monitorService.addToDeleteQueue(req.body.initConfig.agreementId, req.body.initConfig.instanceName);
      this.handleError(res, error, 'Failed to create instance')
    }
  }

  async terminateInstance(req: Request, res: Response) {
    try {
      const agreementIds = Array.isArray(req.body) ? req.body : [req.body];
      await Promise.all(agreementIds.map(async (agreementId: string) => {
        const instance = await dbService.get<InstanceInfo>('instance', agreementId);
        dbService.update('instance', agreementId, { state: 'Terminating' });
        logger.info(`Preparing to terminate instances: ${instance[0].name} - activity_id:${instance[0].activity_id}`);
        await this.cleanupInstance(agreementId);
      }));
      res.status(200).json(ResponseHandler.success());
    } catch (error: any) {
      this.handleError(res, error, 'Failed to terminate instances')
    }
  }

  private async setupServices(
    exe: ExeUnit, 
    agreementId: string, 
    services: ServiceConfig[]
  ): Promise<string | undefined> {
    const proxies: { service: ServiceConfig, proxy: TcpProxy }[] = [];
    const DEFAULT_WEB_PORT = 80;
    const DEFAULT_SSH_PORT = 22;
    let endpoint;

    for (const service of services) {
      const availablePort = await getAvailablePort();
      if (!service.name || !availablePort) {
        throw new Error('Invalid port configuration');
      }

      service.port = service.name === 'web' 
        ? (service.port || DEFAULT_WEB_PORT) 
        : (service.name === 'ssh' && service.port || DEFAULT_SSH_PORT);
      service.listen = availablePort;
      const proxy = exe.createTcpProxy(service.port);
      proxy.listen(service.listen);
      proxies.push({ service, proxy });

      if (service.name === 'ssh') {
        await this.setupSshService(exe, service);
      }

      if (service.name === 'web') {
        endpoint = await proxyService.setupWebProxy(exe.activity.id, service);
      }
    }

    logger.info({
      agreementId,
      services: services
    }, `Services created`);
    instanceProxies.set(agreementId, proxies);
    return endpoint;
  }

  private async setupSshService(exe: ExeUnit, service: ServiceConfig): Promise<void> {
    const key_id = service.options?.ssh_key_id;
    const key = await dbService.get<SshKey>('ssh_key', key_id);
    if (!key[0].public_key) {
      throw new Error(`SSH key not found for id: ${key_id}`);
    }

    const command = `mkdir -p /run/sshd /root/.ssh &&
      ssh-keygen -A &&
      ssh-keygen -t rsa -f /root/.ssh/id_rsa -N '' -q &&
      echo -n '${key[0].public_key}' > /root/.ssh/authorized_keys &&
      /usr/sbin/sshd`;
      
    const result = await exe.run(command);
    logger.info({ stdout: result.stdout }, 'SSH key uploaded');
  }

  public async cleanupInstance(
    agreementId: string,
    options: Partial<InstanceCleanupOptions> = {
      stopInstance: true,
      closeServices: true,
      deleteNode: true
    }
  ): Promise<void> {
    const instance = await dbService.get<InstanceInfo>('instance', agreementId);
    try {
      if (options.stopInstance) {
        await this.stopInstance(instance[0]);
      }
      
      if (options.closeServices) {
        await this.closeServices(instance[0]);
      }
      
      if (options.deleteNode) {
        await this.deleteNode(instance[0]);
      }

      dbService.update('instance', instance[0].agreement_id, { state: 'Terminated' });
      monitorService.addToDeleteQueue(instance[0].agreement_id, instance[0].name);
      
      const reason = 'Terminated instance';
      logger.info(`Instance: ${instance[0].name || instance[0].agreement_id} was Terminated. Reason: ${reason}`);
      monitorService.emit('instanceTerminated', { instance: instance[0], reason });
    } catch (error) {
      logger.error(`Error during cleanup of instance: ${instance[0].name || instance[0].agreement_id}: ${error}`);
      monitorService.emit('error', error as Error);
      throw error;
    }
  }

  private async stopInstance(instance: InstanceInfo): Promise<void> {
    const rental = rentals.get(instance.agreement_id);
    if (rental) {
      try {
        rentals.delete(instance.agreement_id);
        await rental.stopAndFinalize(InstanceController.RENTAL_STOP_TIMEOUT);
      } catch (error) {
        logger.error(`Error stopping and finalizing rental: ${error}`);
        throw error;
      }
    }
  }

  private async closeServices(instance: InstanceInfo): Promise<void> {
    const proxies = instanceProxies.get(instance.agreement_id);
    if (proxies) {
      try {
        for (const Proxy of proxies) {
          try {
            await Proxy.proxy.close();
            if (Proxy.service.name === 'web') {
              await proxyService.removeWebProxy(instance.activity_id);
            }
          } catch (proxyError) {
            logger.error(`Error closing TCP proxy: ${proxyError}`);
          }
        }
        logger.info({
          agreementId: instance.agreement_id,
          services: instance.services
        }, `Services closed`);
        instanceProxies.delete(instance.agreement_id);
      } catch (error) {
        logger.error(`Error closing proxies: ${error}`);
      }
    }
  }

  private async deleteNode(instance: InstanceInfo): Promise<void> {
    const network = instance.vpn_id ? vpnStore.get(instance.vpn_id) : undefined;
    if (network) {
      try {
        const networkInfo = network.getNetworkInfo();
        const nodeIp = Object.entries(networkInfo.nodes)
          .find(([_, id]) => id === instance.provider_id)?.[0];
        
        if (nodeIp) {
          const networkNode = new NetworkNode(
            instance.provider_id,
            nodeIp,
            () => network.getNetworkInfo(),
            ''
          );
          network.removeNode(networkNode);
          logger.info(`Node removed from network - Provider ID: ${instance.provider_id}, IP: ${nodeIp}`);
        } else {
          logger.info(`No matching network node found - Provider ID: ${instance.provider_id}`);
        }
      } catch (error) {
        logger.error(`Failed to remove node from network: ${error}`);
      }
    } 
  }
}

export const instanceController = new InstanceController();

