import { useState, useEffect } from "react";
import { useInstance, DemandOptions, InstanceInfo, InitConfig, ServiceConfig } from '../hooks/useInstance';
import { useGlobalContext } from '../context/GlobalContext';
import { toast } from "react-toastify";
import { PopupWindow } from '../components';
import InstanceConfigForm from "./InstanceConfigForm";
import InstanceRentalForm from "./InstanceRentalForm"

interface CreateInstanceCardProps {
  onClose: (instanceData?: InstanceInfo) => void;
  initialConfig?: InitConfig;
}

export default function CreateInstanceCard({ onClose, initialConfig }: CreateInstanceCardProps) {
  const { address, deposits, instances, networkName, setInstances, getInstanceResources, isLoadingState, setIsLoadingState } = useGlobalContext()
  const { createInstance, addInstance, updateInstance } = useInstance();
  const [agreementId] = useState(initialConfig?.agreementId || 'pending_' + Date.now());
  const [instanceName, setInstanceName] = useState(initialConfig?.instanceName || "");
  const [vpnId, setVpnId] = useState(initialConfig?.vpnId || "");
  const [services, setServices] = useState<ServiceConfig[]>(initialConfig?.services || []);
  const [allocationId, setAllocationId] = useState(initialConfig?.allocationId || "");
  const [launchScriptId, setLaunchScriptId] = useState(initialConfig?.launchScriptId || "");
  const [demandOptions, setDemandOptions] = useState<DemandOptions>(initialConfig?.demandOptions || {
    imageTag: 'jackmama/ubuntu:22.04-ssh',
    minMemGib: 2,
    minCpuThreads: 1,
    minStorageGib: 8,
    capabilities: [],
    subnetTag: "public",
    runtime: {
      name: 'vm'
    }
  });

  const [orderOptions, setOrderOptions] = useState(initialConfig?.orderOptions || {
    rentHours: 1,
    pricing: {
      model: 'burn-rate',
      avgGlmPerHour: 1.0,
    }
  });

  useEffect(() => {
    if (allocationId && deposits.length > 0) {
      const deposit = deposits.find(d => d.allocation_id === allocationId);
      if (deposit) {
        const currentTimeSec = Math.floor(new Date().getTime() / 1000);
        const remainingSeconds = deposit.expiration - currentTimeSec;
        const remainingHours = Math.floor(remainingSeconds / 3600);
        
        setOrderOptions((prev:any) => ({
          ...prev,
          rentHours: Math.max(1, remainingHours)
        }));
      }
    }
  }, [allocationId, deposits]);

  const handleCreateInstance = async () => {
    if (!address) {
      toast.info('Please reconnect your wallet first');
      return;
    }

    setIsLoadingState(prev => ({
      ...prev,
      isInstanceCreating: new Map(prev.isInstanceCreating).set(agreementId, true)
    }));
    
    try {
      const pendingInstance: InstanceInfo = {
        wallet_address: address,
        name: instanceName,
        agreement_id: agreementId,
        allocation_id: allocationId,
        vpn_id: vpnId,
        services: services,
        state: 'Creating',
        image_tag: demandOptions.imageTag
      };

      if (initialConfig?.agreementId) {
        setInstances(prev => prev.filter(instance => instance.agreement_id !== agreementId));
        await updateInstance(agreementId, pendingInstance);
      } else {
        await addInstance(pendingInstance);
      }

      onClose(pendingInstance);

      setIsLoadingState(prev => ({
        ...prev,
        isInstanceCreating: new Map(prev.isInstanceCreating).set(agreementId, false)
      }))

      const configure: InitConfig = {
        agreementId,
        instanceName,
        demandOptions,
        orderOptions,
        allocationId,
        launchScriptId,
        vpnId,
        services
      };
      
      const result = await createInstance(configure);
      if (result.status === 200) {
        setInstances(prev => prev.map(instance => 
          instance.agreement_id === agreementId 
            ? { ...result.data, configure: { ...configure, agreementId: result.data.agreement_id } } 
            : instance
        ));
        getInstanceResources(result.data.provider_id)
      } else {
        setInstances(prev => prev.map(instance => 
          instance.agreement_id === agreementId 
            ? { 
                ...instance, 
                state: 'CreateFailed', 
                details: result.details,
                configure
              }
            : instance
        ));
      }
    } catch (err) {
      if (!initialConfig?.agreementId) {
        setInstances(prev => prev.filter(instance => 
          instance.agreement_id !== agreementId
        ));
      }
      console.error('Failed to create instance:', err);
    }
  };

  return (
    <PopupWindow
      title="Configure your instance"
      content={
        <div className="flex flex-row gap-6 max-h-[70vh] overflow-y-auto">
          <InstanceRentalForm
            instances={instances}
            allocationId={allocationId}
            onAllocationIdChange={setAllocationId}
            demandOptions={demandOptions}
            setDemandOptions={setDemandOptions}
            launchScriptId={launchScriptId}
            setLaunchScriptId={setLaunchScriptId}
            services={services}
            setServices={setServices}
            vpnId={vpnId}
            setVpnId={setVpnId}
            instanceName={instanceName}
            setInstanceName={setInstanceName}
          />
          <InstanceConfigForm
            options={demandOptions}
            setOptions={setDemandOptions}
            orderOptions={orderOptions}
            setOrderOptions={setOrderOptions}
            allocationId={allocationId}
            vpnId={vpnId}
            networkName={networkName}
          />
        </div>
      }
      onClose={() => onClose()}
      onConfirm={() => {
        if (!instanceName || instances.some(instance => instance.name === instanceName) && !initialConfig?.agreementId) {
          const nameInput = document.querySelector('input[placeholder="My first instance"]')
          nameInput?.classList.add('shake')
          setTimeout(() => nameInput?.classList.remove('shake'), 500)
          return
        }
        if (!allocationId) {
          const allocationSelect = document.querySelector('select#deposit-select')
          allocationSelect?.classList.add('shake')
          setTimeout(() => allocationSelect?.classList.remove('shake'), 500)
          return
        }
        handleCreateInstance()
      }}
      confirmDisabled={isLoadingState.isInstanceCreating.get(agreementId) || false}
      closeText="Cancel"
      confirmText={isLoadingState.isInstanceCreating.get(agreementId) || false ? "Creating..." : "Create"}
    />
  );
}
