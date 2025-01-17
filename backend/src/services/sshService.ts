import { Client } from 'ssh2';
import logger from '../logger';
import { dbService } from './dbService';
import { instanceProxies } from '../controllers/instanceController';
import { SshConfig, TunnelConfig, SshKey } from '../types';

export class SshService {
  private connections: Map<string, Client> = new Map();
  private tunnels: Map<string, TunnelConfig[]> = new Map();

  // get SSH key from database
  private async getPrivateKey(key_id: string): Promise<string> {
    try {
      const key = await dbService.get<SshKey>('ssh_key', key_id);
      if (!key || !key[0]?.private_key) {
        throw new Error(`SSH key not found: ${key_id}`);
      }
      return key[0].private_key;
    } catch (error) {
      logger.error(`Failed to get SSH key from database: ${error}`);
      throw new Error('Failed to get SSH key');
    }
  }

  addConnection(agreementId: string, conn: Client) {
    this.terminateConnection(agreementId); // if connection exists, terminate it first
    this.connections.set(agreementId, conn);
    logger.info(`SSH connection added for agreement: ${agreementId}`);
  }

  async createSshConnection(agreementId: string, config: SshConfig) {
    try {
      const serviceInfo = instanceProxies.get(agreementId);
      if (!serviceInfo) {
        throw new Error(`Your instance does not have terminal service enabled for agreement: ${agreementId}`);
      }

      const sshPort = serviceInfo.find(item => item.service.name === 'ssh')?.service.listen;
      if (!sshPort) {
        throw new Error('SSH port not found');
      }

      // get private key from database
      const privateKey = await this.getPrivateKey(serviceInfo[0]?.service.options?.ssh_key_id);
      
      // SSH connection config
      const conn = new Client();
      const sshConfig = {
        host: '127.0.0.1',
        port: sshPort,
        username: config.user_name,
        privateKey
      };
      
      // if tunnel config is provided, set port forwarding
      if (config.tunnel) {
        conn.on('ready', () => {
          conn.forwardIn('127.0.0.1', config.tunnel!.local_port, (err) => {
            if (err) {
              logger.error(`Port forward error: ${err}`);
              return;
            }
            logger.info({},`Forwarding port ${config.tunnel!.local_port} -> ${config.tunnel!.remote_host}:${config.tunnel!.remote_port}`);
          });

          // handle forwarding connection
          conn.on('tcp connection', (info, accept, reject) => {
            const stream = accept();
            const remote = require('net').connect({
              host: config.tunnel!.remote_host,
              port: config.tunnel!.remote_port
            });

            stream.pipe(remote).pipe(stream);

            stream.on('error', (err: any) => {
              logger.error(`Stream error: ${err}`);
              remote.destroy();
            });

            remote.on('error', (err: any) => {
              logger.error(`Remote error: ${err}`);
              stream.destroy();
            });
          });
        });
        // save tunnel config
        const tunnels = this.tunnels.get(agreementId) || [];
        tunnels.push(config.tunnel);
        this.tunnels.set(agreementId, tunnels);
      }

      return { 
        conn, 
        sshConfig
      };

    } catch (error) {
      throw error;
    }
  }

  // create new tunnel
  async createTunnel(agreementId: string, tunnelConfig: TunnelConfig) {
    const conn = this.connections.get(agreementId);
    if (!conn) {
      throw new Error('No SSH connection found');
    }

    return new Promise((resolve, reject) => {
      conn.forwardIn('127.0.0.1', tunnelConfig.local_port, (err) => {
        if (err) {
          reject(err);
          return;
        }

        const tunnels = this.tunnels.get(agreementId) || [];
        tunnels.push(tunnelConfig);
        this.tunnels.set(agreementId, tunnels);
        
        resolve(true);
      });
    });
  }

  // close specified tunnel
  async closeTunnel(agreementId: string, localPort: number) {
    const conn = this.connections.get(agreementId);
    if (!conn) return;

    return new Promise((resolve) => {
      conn.unforwardIn('127.0.0.1', localPort, () => {
        const tunnels = this.tunnels.get(agreementId) || [];
        const updatedTunnels = tunnels.filter(t => t.local_port !== localPort);
        this.tunnels.set(agreementId, updatedTunnels);
        resolve(true);
      });
    });
  }

  terminateConnection(agreementId: string) {
    const conn = this.connections.get(agreementId);
    if (conn) {
      try {
        // close all related tunnels
        const tunnels = this.tunnels.get(agreementId) || [];
        tunnels.forEach(tunnel => {
          conn.unforwardIn('127.0.0.1', tunnel.local_port);
        });
        this.tunnels.delete(agreementId);

        conn.end();
        this.connections.delete(agreementId);
        logger.info(`SSH connection terminated for agreement: ${agreementId}`);
      } catch (error) {
        logger.error(`Error terminating SSH connection: ${error}`);
      }
    }
  }

  terminateAllConnections() {
    for (const [agreementId] of this.connections) {
      this.terminateConnection(agreementId);
    }
  }

  // get all active tunnels for instance
  getTunnels(agreementId: string): TunnelConfig[] {
    return this.tunnels.get(agreementId) || [];
  }
}

export const sshService = new SshService(); 