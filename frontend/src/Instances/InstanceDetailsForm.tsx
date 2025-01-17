import { ServiceConfig, ProviderResources, InstanceInfo } from '../hooks/useInstance'
import { VpnInfo } from '../hooks/useVPN'
import { DetailPanel, CopyButton } from '../components'

interface InstanceDetailsProps {
  vpns: VpnInfo[]
  instance: InstanceInfo | null
  onClose: () => void
  providerResources: ProviderResources[]
  onHeightChange?: (height: number) => void
  initialHeight?: number
}

export default function InstanceDetails({
  vpns,
  instance, 
  onClose,
  providerResources, 
  onHeightChange,
  initialHeight
}: InstanceDetailsProps) {
  if (!instance) return null
  const providerResource = providerResources.find(provider => provider.providerId === instance.provider_id)
  const services = Array.isArray(instance.services) 
    ? instance.services 
    : JSON.parse(instance.services || '[]');
  const capabilities = (() => {
    try {
      const caps = typeof instance.capabilities === 'string' 
        ? JSON.parse(instance.capabilities)
        : instance.capabilities;
      
      return Array.isArray(caps)
        ? caps.map((cap: string) => cap.replace('cap_', ''))
        : [];
    } catch (e) {
      console.log('Error parsing capabilities:', e);
      return [];
    }
  })();

  const basicInfo = (
      <div className="space-y-2">
        <div className="flex">
          <span className="text-sm w-24 font-semibold mb-2">Name:</span>
          <span className="text-sm">{instance.name}</span>
        </div>
        <div className="flex">
          <span className="text-sm w-24 font-semibold mb-2">Allocation ID:</span>
          <span className="text-sm">{instance.allocation_id}</span>
          {}<CopyButton text={instance.allocation_id}/>
        </div>
        <div className="flex">
          <span className="text-sm w-24 font-semibold mb-2">Agreement ID:</span>
          <span className="text-sm">{instance.agreement_id}</span>
          <CopyButton text={instance.agreement_id}/>
        </div>
        <div className="flex">
          <span className="text-sm w-24 font-semibold mb-2">Provider ID:</span>
          <span className="text-sm">{instance.provider_id || 'pending'}</span>
          <CopyButton text={instance.provider_id}/>
        </div>
        <div className="flex">
          <span className="text-sm w-24 font-semibold mb-2">Activity ID:</span>
          <span className="text-sm">{instance.activity_id || 'pending'}</span>
          <CopyButton text={instance.activity_id}/>
        </div>
        <div className="flex">
          <span className="text-sm w-24 font-semibold mb-2">Launch script:</span>
          <span className="text-sm">{instance.configure?.launchScriptId}</span>
        </div>
        <div className="flex">
          <span className="text-sm w-24 font-semibold mb-2">Capabilities:</span>
          {capabilities?.length ? (
            <div className="flex gap-2 flex-wrap">
              {capabilities.map((cap: string, index) => (
                <span 
                  key={index} 
                  className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium"
                >
                  {cap || 'none'}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-sm text-base-content/50">None</span>
          )}
        </div>
      </div>
  )

  const configInfo = (
    <div className="space-y-2">
      <div className="flex">
        <span className="text-sm w-24 font-semibold mb-2">Image Tag:</span>
        <span className="text-sm">{instance.image_tag}</span>
        <CopyButton text={instance.image_tag}/>
      </div>
      
      <div className="flex">
        <span className="text-sm w-24 font-semibold mb-2">CPU:</span>
        <span className="text-sm">{providerResource?.cpu}</span>
      </div>
      <div className="flex">
        <span className="text-sm w-24 font-semibold mb-2">Threads:</span>
        <span className="text-sm">{providerResource?.threads}</span>
      </div>
      <div className="flex">
        <span className="text-sm w-24 font-semibold mb-2">Memory:</span>
        <span className="text-sm">{providerResource?.memory.toFixed(2)} GiB</span>
      </div>
      <div className="flex">
        <span className="text-sm w-24 font-semibold mb-2">Storage:</span>
        <span className="text-sm">{providerResource?.storage.toFixed(2)} GiB</span>
      </div>

      {providerResource?.gpu && (
        <>
          <div className="flex">
            <span className="text-sm w-24 font-semibold mb-2">GPU:</span>
            <span className="text-sm">{providerResource.gpu.name}</span>
          </div>
          <div className="flex">
            <span className="text-sm w-24 font-semibold mb-2">VRAM:</span>
            <span className="text-sm">{providerResource.gpu.memory.toFixed(2)} GiB</span>
          </div>
        </>
      )}
    </div>
  )

  const networkInfo = (
    <div className="space-y-2">
      <div className="flex">
        <span className="text-sm w-24 font-semibold mb-2">VPN:</span>
        <div className="flex gap-2 flex-wrap">
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
            {vpns.find(vpn => vpn.vpn_id === instance.vpn_id)?.name || 'None'}
          </span>
        </div>
      </div>
      <div className="flex">
        <span className="text-sm w-24 font-semibold mb-2">Services:</span>
        <div className="flex flex-wrap gap-2">
          {services.length ? (
            services.map((service: ServiceConfig, index: number) => (
              <div key={`${service.name}-${index}`} className="flex items-center">
                {service.port ? (
                  <>
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                      {service.name}:{service.port}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-base-content/50">None</span>
                )}
              </div>
            ))
          ) : (
            <span className="text-sm text-base-content/50">None</span>
          )}
        </div>
      </div>
      <div className="flex">
        <span className="text-sm w-24 font-semibold mb-2">Endpoint:</span>
          {instance.endpoint ? (
            <>
            <a href={`http://${instance.endpoint}`}
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-sm text-primary hover:underline"
            >
              {instance.endpoint || 'pending'}
            </a>
            <CopyButton text={instance.endpoint}/>
          </>
        ) : (
            <span className="text-sm text-base-content/50">None</span>
          )}
      </div>
    </div>
  )

  const tabs = [
    {
      key: 'basic',
      label: 'Basic Info',
      content: basicInfo
    },
    {
      key: 'config',
      label: 'Configuration',
      content: configInfo
    },
    {
      key: 'network',
      label: 'Network',
      content: networkInfo
    }
  ]

  return (
    <DetailPanel
      title="Details"
      tabs={tabs}
      onClose={onClose}
      onHeightChange={onHeightChange}
      initialHeight={initialHeight}
    />
  )
} 