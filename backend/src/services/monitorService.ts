import { yagnaService } from './yagnaService';
import { InstanceInfo } from '../types';
import { dbService } from './dbService';
import { EventEmitter } from 'events';
import { GolemNetwork, Allocation } from '@golem-sdk/golem-js';
import { instanceController } from '../controllers/instanceController';
import logger from '../logger';

interface Networks {
  holesky: GolemNetwork;
  polygon: GolemNetwork;
}

interface checkInfo {
  network?: string;
  instanceName?: string;
  agreementId?: string;
  allocationId?: string;
  activityId?: string;
  state?: string;
}

enum InstanceState {
  Creating = 'Creating',
  Active = 'Active',
  Terminating = 'Terminating',
  Terminated = 'Terminated',
  CreateFailed = 'CreateFailed'
}

export const deletionQueue: Map<string, number> = new Map();

class MonitorService extends EventEmitter {
  private checkInterval: NodeJS.Timeout | null = null;
  private static readonly CHECK_INTERVAL = Number(process.env.INSTANCE_CHECK_INTERVAL || 60 ) * 1000;
  private static readonly DELETION_DELAY = Number(process.env.INSTANCE_DELETION_DELAY || 5 * 60 ) * 1000;
  private static readonly CONFIG = {
    TIMEOUT_THRESHOLD: 120 * 1000, // 2 minutes
    MIN_REMAINING_AMOUNT: 0.01
  } as const;

  private async checkInstances() {
    try {
      const networks = await this.initializeNetworks();
      if (!networks) return;

      const instances = await dbService.get<InstanceInfo>('instance');
      await Promise.all(instances.map(instance => 
        this.processInstance(instance, networks)));
      
      this.processDeleteQueue();
    } catch (error) {
      logger.error({ err: error }, 'Error checking instances');
    }
  }

  private async initializeNetworks() {
    const glmHolesky = await yagnaService.getGlm('holesky');
    const glmPolygon = await yagnaService.getGlm('polygon');
    
    if (!glmHolesky || !glmPolygon) {
      logger.error('Yagna not initialized for one or both networks');
      return null;
    }
    
    return { holesky: glmHolesky, polygon: glmPolygon };
  }

  private createLogContext(
    instance?: InstanceInfo,
    additional?: Partial<checkInfo>
  ): checkInfo {
    return {
      ...(instance && {
        instanceName: instance.name,
        agreementId: instance.agreement_id,
        network: instance.network
      }),
      ...additional
    };
  }

  private async processInstance(
    instance: InstanceInfo, 
    networks: Networks
  ): Promise<void> {
    const logContext = this.createLogContext(instance);

    try {
      if (this.shouldSkipInstance(instance)) return;
      
      const glm = instance.network === 'holesky' 
        ? networks.holesky 
        : networks.polygon;
        
      await this.validateInstanceState(instance, glm);
    } catch (error) {
      logger.error({ ...logContext, err: error }, 'Error processing instance');
      this.emit('error', error);
    }
  }

  private shouldSkipInstance(instance: InstanceInfo): boolean {
    if (!deletionQueue.has(instance.agreement_id) && 
        instance.state === InstanceState.Terminated) {
      const deletionTime = Date.now() + MonitorService.DELETION_DELAY;
      deletionQueue.set(instance.agreement_id, deletionTime);
      return true;
    }
    
    return deletionQueue.has(instance.agreement_id) || 
           instance.state !== InstanceState.Active;
  }

  private async validateInstanceState(
    instance: InstanceInfo, 
    glm: GolemNetwork
  ): Promise<void> {
    const logContext = this.createLogContext(instance);

    try {
      const allocation = await glm.payment.getAllocation(instance.allocation_id);
      const shouldTerminate = await this.checkAllocationValidity(allocation);
      
      if (shouldTerminate) {
        logger.info({
          ...logContext,
          allocationId: allocation.id
        }, 'Instance terminating due to invalid allocation');
        throw new Error('Allocation invalid');
      }

      await this.getActivityState(glm, instance.activity_id)
      .then(async (state) => {
        logger.info({
          ...logContext,
          state: state,
        }, 'Instances state check');
        if (state === 'Terminated') {
          throw new Error('Activity terminated');
        }
      })
      .catch(async (error) => {
        logger.error({ 
          ...logContext,
          err: error.message,
        }, 'Instance check failed, marking for deletion');
        await this.markInstanceForDeletion(instance);
      });
    } catch (error) {
      logger.error({ 
        ...logContext,
        err: error,
      }, 'Instance check failed, marking for deletion');
      await this.markInstanceForDeletion(instance);
    }
  }

  private async checkAllocationValidity(allocation: Allocation): Promise<boolean> {
    const logContext = this.createLogContext(undefined, { allocationId: allocation.id });
    
    try {
      const timeoutDate = new Date(allocation.timeout || '').getTime();
      const now = new Date().getTime();
      const remainingAmount = Number(allocation.remainingAmount);
      
      if (timeoutDate - MonitorService.CONFIG.TIMEOUT_THRESHOLD <= now) {
        logger.info(logContext, 'Allocation expiring soon');
        return true;
      }
      
      if (remainingAmount <= MonitorService.CONFIG.MIN_REMAINING_AMOUNT) {
        logger.info(logContext, 'Allocation remaining amount is too low');
        return true;
      }

      return false;
    } catch (error) {
      logger.error({ ...logContext, err: error }, 'Error checking allocation validity');
      return true;
    }
  }

  private async getActivityState(glm: GolemNetwork, activityId: string) {
    const activity = await glm.activity.findActivityById(activityId);
    return activity.getState();
  }

  private async processDeleteQueue() {
    const now = Date.now();
    for (const [agreementId, deletionTime] of deletionQueue.entries()) {
      if (now >= deletionTime) {
        const logContext = this.createLogContext(undefined, { agreementId });
        try {
          await dbService.delete('instance', agreementId);
          logger.info(logContext, 'Instance has been deleted from database after delay');
          deletionQueue.delete(agreementId);
        } catch (error) {
          logger.error({ 
            ...logContext,
            err: error 
          }, 'Failed to delete instance from database');
        }
      }
    }
  }

  public addToDeleteQueue(agreementId: string, instanceName?: string) {
    const logContext = this.createLogContext(undefined, { 
      instanceName,
      agreementId
    });

    if (deletionQueue.has(agreementId)) {
      logger.debug(logContext, 'Instance already in deletion queue');
      return;
    }

    const deletionTime = Date.now() + MonitorService.DELETION_DELAY;
    deletionQueue.set(agreementId, deletionTime);
    logger.info(logContext, 'Instance added to deletion queue');
  }

  private async markInstanceForDeletion(instance: InstanceInfo) {
    const logContext = this.createLogContext(instance);
    try {
      if (deletionQueue.has(instance.agreement_id)) return;

      await instanceController.cleanupInstance(instance.agreement_id);

      await dbService.update('instance', instance.agreement_id, {
        state: InstanceState.Terminated
      });
      
      this.addToDeleteQueue(instance.agreement_id, instance.name);
      logger.info(logContext, 'Instance marked for deletion');
    } catch (error) {
      logger.error({ 
        ...logContext,
        err: error
      }, 'Error marking instance for deletion');
      this.emit('error', error);
    }
  }

  public startMonitoring(timeout?: number) {
    if (!this.checkInterval) {
      this.checkInterval = setInterval(
        () => this.checkInstances(), 
        timeout || MonitorService.CHECK_INTERVAL
      );
      logger.info('Instance monitoring started');
    }
  }

  public stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Instance monitoring stopped');
    }
  }
}

export const monitorService = new MonitorService(); 