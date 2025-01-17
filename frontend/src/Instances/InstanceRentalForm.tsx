import { useGlobalContext } from "../context/GlobalContext";
import { useEffect, useMemo, useState } from "react";
import { InstanceInfo, DemandOptions, ServiceConfig } from "../hooks/useInstance";
import { Tips } from "../components";

const AVAILABLE_SERVICES = [
  { value: 'web', label: 'HTTP Endpoint', tip: 'Make sure your instance has the specified port open. It will generate an http endpoint for access. Default port: 80.' },
  { value: 'ssh', label: 'Terminal', tip: 'Make sure the SSH service is enabled on your instance, specify the port you will be able to access the terminal on, and set up a key. Default port: 22.' },
] as const;

interface InstanceRentalFormProps {
  instances: InstanceInfo[];
  instanceName: string;
  setInstanceName: (name: string) => void;
  allocationId: string;
  onAllocationIdChange: (id: string) => void;
  demandOptions: DemandOptions;
  setDemandOptions: (options: any) => void;
  launchScriptId: string;
  setLaunchScriptId: (id: string) => void;
  disabled?: boolean;
  services: ServiceConfig[];
  setServices: React.Dispatch<React.SetStateAction<ServiceConfig[]>>;
  vpnId: string;
  setVpnId: (id: string) => void;
}

export default function InstanceRentalForm({
  instances,
  instanceName,
  setInstanceName,
  allocationId,
  onAllocationIdChange,
  demandOptions,
  setDemandOptions,
  launchScriptId,
  setLaunchScriptId,
  disabled = false,
  services,
  setServices,
  vpnId,
  setVpnId,
}: InstanceRentalFormProps) {
  const { vpns, deposits, keys, scripts, truncateId } = useGlobalContext();
  const validAllocations = useMemo(() => {
    const currentTime = Math.floor(Date.now() / 1000);
    return deposits.filter(d => d.allocation_id && d.expiration > currentTime);
  }, [deposits]);

  const [nameWarning, setNameWarning] = useState<string>('');

  useEffect(() => {
    if (validAllocations.length > 0 && !allocationId) {
      onAllocationIdChange(validAllocations[0].allocation_id || '');
    }
  }, [validAllocations, allocationId, onAllocationIdChange]);

  useEffect(() => {
    if (!vpnId) {
      setServices([]);
    }
  }, [vpnId]);

  const handleInputChange = (field: string, value: string) => {
    if (field === 'imageTag') {
      setDemandOptions({
        ...demandOptions,
        imageTag: value
      });
    } else if (field === 'launchScriptId') {
      setLaunchScriptId(value);
    } else if (field === 'instanceName') {
      if (Array.isArray(instances) && instances.some(instance => instance.name === value)) {
        setNameWarning('This instance name already exists.');
      } else {
        setNameWarning('');
      }
      setInstanceName(value);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-2 min-w-[400px]">
      <div className="form-control">
        <label className="label">
          <span className="label-text">Instance Name</span>
        </label>
        <input
          type="text"
          className={`input input-bordered input-sm ${nameWarning ? 'input-error' : ''}`}
          placeholder="My first instance"
          value={instanceName}
          onChange={(e) => handleInputChange('instanceName', e.target.value)}
          required
        />
        {nameWarning && <p className="text-error text-sm mt-1">{nameWarning}</p>}
      </div>
      <div className="form-control">
        <label className="label">
          <span className="label-text">Selected Deposit</span>
        </label>
        <select
          id="deposit-select"
          value={allocationId}
          disabled={disabled || validAllocations.length === 0}
          className="select select-bordered select-sm"
          onChange={(e) => onAllocationIdChange(e.target.value)}
          required
        >
          {validAllocations.length === 0 ? (
            <option value="">No deposit allocations have been created</option>
          ) : (
            validAllocations.map((item) => (
              <option key={item.allocation_id} value={item.allocation_id}>
                {truncateId(item.name, 16, 6)}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="form-control">
        <label className="label">
          <div className="flex items-center gap-1">Image Tag
          <Tips 
            content={
              <>
                Non-standard Docker image.
                <a 
                  href="https://registry.golem.network/explore"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link link-primary text-sm"
                >
                  Hub.
                </a>
                <br />
                refer to the documentation to create an image.
                <a 
                  href="https://docs.golem.network/docs/creators/tools/gvmkit/converting-docker-image-to-golem-format"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link link-primary text-sm"
                >
                  Doc.
                </a>
              </>
            }>
          </Tips>
          </div>
        </label>
        <input
          type="text"
          placeholder="Enter image tag"
          className="input input-bordered input-sm"
          value={demandOptions.imageTag}
          onChange={(e) => handleInputChange('imageTag', e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">VPN</span>
        </label>
        <select
          value={vpnId}
          className="select select-bordered select-sm"
          onChange={(e) => setVpnId(e.target.value)}
          disabled={disabled}
        >
          <option value="">No VPN</option>
          {vpns.map((vpn) => (
            <option key={vpn.vpn_id} value={vpn.vpn_id}>
              {vpn.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">
          <span className="label-text">Services</span>
        </label>
        
        <div className="flex flex-col gap-2">
          {AVAILABLE_SERVICES.map(({ value, label, tip }) => (
            <label 
              key={value}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="checkbox"
                className="checkbox checkbox-sm checkbox-primary"
                checked={services.some(s => s.name === value)}
                disabled={disabled || !vpnId}
                onChange={(e) => {
                  if (e.target.checked) {
                    setServices(prev => [...prev, { name: value }]);
                  } else {
                    setServices(prev => prev.filter(s => s.name !== value));
                  }
                }}
              />
              <span className="label-text">{label}</span>
              <Tips content={tip} />
            
              {services.some(s => s.name === value) && (
                <>
                  <input
                    type="number"
                    placeholder="instance port"
                    className="input input-bordered input-sm"
                    onChange={(e) => {
                      setServices(prev => prev.map(s => 
                        s.name === value ? { ...s, port: parseInt(e.target.value) } : s
                      ));
                    }}
                  />
                  {value === 'ssh' && (
                    <select
                      value={services.find(s => s.name === value)?.options?.ssh_key_id || ''}
                      className="select select-bordered select-sm"
                      onChange={(e) => setServices(prev => prev.map(s => 
                        s.name === value ? { ...s, options: { ...s.options, ssh_key_id: e.target.value } } : s
                      ))}
                    >
                      <option value="">No SSH Key</option>
                      {keys.map((key) => (
                        <option key={key.key_id} value={key.key_id}>
                          {key.name}
                        </option>
                      ))}
                    </select>
                  )}
                </>
              )}
            </label>
          ))}
        </div>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Launch Script</span>
        </label>
        <select className="select select-bordered select-sm"
          value={launchScriptId}
          onChange={(e) => setLaunchScriptId(e.target.value)}
          disabled={disabled}
        >
          <option value="">No Launch Script</option>
          {scripts.map((script) => (
            <option key={script.script_id} value={script.script_id}>
              {script.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
