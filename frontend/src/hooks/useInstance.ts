import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useApi } from '../api';

export interface DemandOptions {
  imageTag: string;
  minMemGib: number;
  minCpuThreads: number;
  minStorageGib: number;
  capabilities?: string[];
  subnetTag: string;
  runtime: {
    name: string,
  };
}

export interface InstanceInfo {
  wallet_address: string;
  name?: string;
  agreement_id: string;
  allocation_id: string;
  activity_id?: string;
  provider_id?: string;
  capabilities?: string[];
  image_tag: string;
  expiration?: number;
  vpn_id?: string;
  services?: ServiceConfig[];
  ipv4_address?: string;
  state: string;
  endpoint?: string;
  details?: string;
  configure?: any;
}

export interface InitConfig {
  instanceName: string;
  vpnId?: string;
  sshKeyId?: string;
  allocationId: string;
  launchScriptId?: string;
  demandOptions: DemandOptions;
  orderOptions: any;
  services: ServiceConfig[];
  agreementId?: string;
}

export interface ProviderResources {
  providerId: string;
  cpu: number;
  threads: number;
  memory: number;
  storage: number;
  gpu?: {
    name: string;
    memory: number;
  };
}

export interface ServiceConfig {
  name: 'web' | 'ssh';
  port?: number;
  options?: any;
}

export function useInstance() {  
  const [error, setError] = useState<string | null>(null);
  const [instances, setInstances] = useState<InstanceInfo[]>([])
  const [providerResources, setProviderResources] = useState<ProviderResources[]>([])
  const [reloadInstances, setReloadInstances] = useState<number>(0)
  const { address } = useAccount()
  const apiRequest = useApi()

  const addInstance = async (datas: InstanceInfo) => {
    try {
      const response = await apiRequest.post('/insert/instance', { data: datas });
      return response
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const updateInstance = async (agreementId: string, updates: any) => {
    try {
      const response = await apiRequest.put(`/update/instance/${agreementId}`, { updates });
      return response
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  }

  const createInstance = async (
    initConfig: InitConfig
  ) => {
    try {
      const response = await apiRequest.post('/instance/create', {
        initConfig
      });
      return response
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const terminateInstance = async (agreementIds: string[]) => {
    try {
      const response = await apiRequest.delete('/instance/terminate', agreementIds);
      return response
    } catch (error) {
      console.error('Error terminating instance(s):', error);
      throw error;
    }
  };

  const getInstanceResources = async (providerId: string) => {
    try {
      const response = await fetch(`https://api.stats.golem.network/v2/provider/node/${providerId}`)
      if (response.status === 200) {
        const data = await response.json()
        setProviderResources(prev => [...prev, {
          providerId,
          cpu: data[0].runtimes.vm.properties["golem.inf.cpu.brand"],
          threads: data[0].runtimes.vm.properties["golem.inf.cpu.threads"],
          memory: data[0].runtimes.vm.properties["golem.inf.mem.gib"],
          storage: data[0].runtimes.vm.properties["golem.inf.storage.gib"],
          gpu: data[0].runtimes["vm-nvidia"]?.properties ? {
            name: data[0].runtimes["vm-nvidia"].properties["golem.!exp.gap-35.v1.inf.gpu.model"],
            memory: data[0].runtimes["vm-nvidia"].properties["golem.!exp.gap-35.v1.inf.gpu.memory.total.gib"]
            } : undefined
          }])
      } else {
        console.warn(`No valid data found for provider ${providerId}`)
      }
    } catch (error) {
      console.error('Error getting instance resources:', error)
    }
  }

  const getInstances = async () => {
    try {
      const response = await apiRequest.get(`/get/instance/${address}`)
      const instances = Array.isArray(response.data as InstanceInfo) && response.data;
      setInstances(instances)
      for (const instance of instances) {
        if (instance.state === 'Active' && !providerResources.map(resource => resource.providerId).includes(instance.provider_id)) {
          getInstanceResources(instance.provider_id)
        }
      }
    } catch (error) {
      console.error('Error getting instances:', error)
    }
  }

  return {
    createInstance,
    terminateInstance,
    addInstance,
    reloadInstances,
    setReloadInstances,
    providerResources,
    getInstanceResources,
    error,
    instances,
    setInstances,
    getInstances,
    updateInstance
  };
}
