import { useGlobalContext } from "../context/GlobalContext";
import { useMemo } from "react";
import { DemandOptions } from "../hooks/useInstance";
import { Tips } from "../components";

const AVAILABLE_CAPABILITIES = [
  { value: '!exp:gpu', label: 'NVIDIA GPU' },
] as const;

type InstanceConfigFormProps = {
  options: DemandOptions;
  setOptions: (config: DemandOptions) => void;
  orderOptions: any;
  setOrderOptions: (options: any) => void;
  allocationId: string;
  vpnId: string;
  networkName: string;
};

function formatEstimatedTime(hours: number): string {
  if (hours < 1) {
    const minutes = Math.floor(hours * 60);
    return `${minutes} minutes`;
  } else if (hours < 24) {
    const wholeHours = Math.floor(hours);
    const minutes = Math.floor((hours - wholeHours) * 60);
    return minutes > 0 
      ? `${wholeHours} hours ${minutes} minutes`
      : `${wholeHours} hours`;
  } else {
    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);
    return remainingHours > 0 
      ? `${days} days ${remainingHours} hours`
      : `${days} days`;
  }
}

export default function InstanceConfigForm({
  options,
  setOptions,
  orderOptions,
  setOrderOptions,
  allocationId,
  networkName,
}: InstanceConfigFormProps) {
  const { deposits } = useGlobalContext();

  const { maxGlmPerHour, estimatedHours } = useMemo(() => {
    const currentAllocation = deposits.find(d => d.allocation_id === allocationId);
    if (!currentAllocation) {
      return { maxGlmPerHour: 1.0, estimatedHours: 0 };
    }
    const currentTime = Math.floor(Date.now() / 1000);
    const remainingTime = Math.max(0, currentAllocation.expiration - 60 - currentTime);
    const maxHours = remainingTime / 3600;
    const maxGlm = (currentAllocation.balance || 0) * 2;
    
    const currentGlmPerHour = orderOptions.pricing.model === 'burn-rate' 
      ? orderOptions.pricing.avgGlmPerHour 
      : 1.0;
    const estimatedRunHours = Math.min(
      maxHours,
      (maxGlm / 2) / currentGlmPerHour
    );

    return {
      maxGlmPerHour: maxGlm,
      estimatedHours: estimatedRunHours
    };
  }, [deposits, allocationId, orderOptions]);

  const handleCapabilityChange = (capability: string) => {
    const currentCapabilities = options.capabilities;
    const updatedCapabilities = currentCapabilities?.includes(capability)
      ? currentCapabilities.filter(cap => cap !== capability)
      : [...currentCapabilities || [], capability];

    const hasNvidiaGpu = capability === '!exp:gpu' 
      ? !currentCapabilities?.includes('!exp:gpu')
      : updatedCapabilities?.includes('!exp:gpu');

    setOptions({
      ...options,
      capabilities: updatedCapabilities,
      runtime: {
        name: hasNvidiaGpu ? 'vm-nvidia' : 'vm'
      }
    });
  };

  const marketStatsLink = (
    <a 
      href="https://stats.golem.network/network/providers/online"
      target="_blank" 
      rel="noopener noreferrer" 
      className="link link-primary text-sm"
    >
      Market.
    </a>
  );

  return (
      <div className="flex flex-col gap-4 p-2 min-w-[400px]">

        <div className="form-control">
          <label className="label">
            <span className="label-text">CPU threads (minimum)</span>
          </label>
          <input
            type="range"
            min={1}
            max={16}
            value={options.minCpuThreads}
            onChange={(e) => {
              setOptions({
                ...options,
                minCpuThreads: parseInt(e.target.value),
              });
            }}
            className="range range-primary"
            step={1}
          />
          <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] text-xs place-items-center">
            {Array.from({ length: 16 }, (_, i) => (
              <span key={"thread" + i}>{i + 1}</span>
            ))}
          </div>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Gigabytes of RAM (minimum)</span>
          </label>
          <input
            type="range"
            min={1}
            max={16}
            value={options.minMemGib}
            onChange={(e) => {
              setOptions({
                ...options,
                minMemGib: parseInt(e.target.value),
              });
            }}
            className="range range-primary"
            step={1}
          />
          <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] text-xs place-items-center">
            {Array.from({ length: 16 }, (_, i) => (
              <span key={"ram" + i}>{i + 1}</span>
            ))}
          </div>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Min storage (GiB)</span>
          </label>
          <input
            type="range"
            min={2}
            max={32}
            value={options.minStorageGib}
            onChange={(e) => {
              setOptions({
                ...options,
                minStorageGib: parseInt(e.target.value),
              });
            }}
            className="range range-primary"
            step={2}
          />
          <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] text-xs place-items-center">
            {Array.from({ length: 16 }, (_, i) => (
              <span key={"storage" + i}>{2 * (i + 1)}</span>
            ))}
          </div>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">GLM per Hour (max: {maxGlmPerHour})</span>
          </label>
          <input
            type="range"
            min={0.5}
            max={maxGlmPerHour}
            value={orderOptions.pricing.model === 'burn-rate' ? orderOptions.pricing.avgGlmPerHour : '0.5'}
            onChange={(e) => {
              const newValue = parseFloat(e.target.value);
              setOrderOptions({
                ...orderOptions,
                pricing: {
                  model: 'burn-rate',
                  avgGlmPerHour: newValue
                }
              });
            }}
            className="range range-primary"
            step={0.1}
          />
          <div className="text-xs mt-1">
            {orderOptions.pricing.model === 'burn-rate' ? orderOptions.pricing.avgGlmPerHour.toFixed(3) : '0.5'} GLM/h
          </div>
          <label className="label">
            <span className="label-text-alt">Estimated runtime: {formatEstimatedTime(estimatedHours)}</span>
          </label>
        </div>
        
        <div className="form-control">
          <label className="label">
            <span className="label-text">Capabilities</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_CAPABILITIES.map(({ value, label }) => (
              <label 
                key={value} 
                className={`flex items-center gap-2 cursor-pointer`}
              >
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm checkbox-primary"
                  checked={options.capabilities?.includes(value)}
                  onChange={() => handleCapabilityChange(value)}
                  disabled={value === '!exp:gpu' && networkName !== 'polygon'}
                />
                <span className="label-text">{label}</span>
                <Tips content={
                  networkName === 'polygon'
                    ? <>
                        To prevent no provider response, please go to the market to check the provider's quotes and adjust your GLM per Hour price appropriately.
                        {marketStatsLink}
                      </>
                    : 'NVIDIA GPU is not supported on this network'
                } />
              </label>
            ))}
          </div>
        </div>

      </div>
  );
}
