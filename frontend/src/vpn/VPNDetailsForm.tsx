import { VpnInfo } from '../hooks/useVPN'
import { DetailPanel, CopyButton } from '../components'
import { InstanceInfo } from '../hooks/useInstance'
import { Link } from 'react-router-dom'

interface VpnDetailsProps {
  vpn: VpnInfo | null
  instances: InstanceInfo[]
  onClose: () => void
  onHeightChange?: (height: number) => void
}

export default function VpnDetails({vpn, instances, onClose, onHeightChange}: VpnDetailsProps) {
  if (!vpn) return null
  const nodes = instances
    .filter(instance => instance.vpn_id === vpn.vpn_id)
    .map(instance => ({
      agreement_id: instance.agreement_id, 
      name: instance.name,
      state: instance.state
    })
  )

  const basicInfo = (
    <div className="space-y-2">
      <div className="flex">
        <span className="text-sm w-24 font-semibold mb-2">Name:</span>
        <span className="text-sm">{vpn.name}</span>
      </div>
      <div className="flex">
        <span className="text-sm w-24 font-semibold mb-2">VPN ID:</span>
        <span className="text-sm">{vpn.vpn_id}</span>
        <CopyButton text={vpn.vpn_id}/>
      </div>
      <div className="flex">
        <span className="text-sm w-24 font-semibold mb-2">CIDR:</span>
        <span className="text-sm">{vpn.cidr}</span>
      </div>
      <div className="flex">
        <span className="text-sm w-24 font-semibold mb-2">Created At:</span>
        <span className="text-sm">{new Date(vpn.created_at|| 0 * 1000).toLocaleString()}</span>
      </div>
    </div>
  )
  
  const nodesInfo = (
    <div className="space-y-2">
      {nodes.map((node, index) => (
        <div key={index} className="flex">
          <span className="text-sm w-24 font-semibold mb-2">{node.name}:</span>
          <span className="text-sm">
            <Link to={`/instance/${node.agreement_id}`} className="text-primary text-sm hover:underline">
              {node.agreement_id}
            </Link>
            <span className="text-sm text-base-content/50">({node.state})</span>
          </span>
        </div>
      ))}
      {nodes.length === 0 && (
        <span className="text-sm text-base-content/50">No associated nodes yet</span>
      )}
    </div>
  )

  const tabs = [
    {
      key: 'basic',
      label: 'Basic Info',
      content: basicInfo
    },
    {
      key: 'nodes',
      label: 'Nodes',
      content: nodesInfo
    }
  ]

  return (
    <DetailPanel
      title="Details"
      tabs={tabs}
      onClose={onClose}
      onHeightChange={onHeightChange}
    />
  )
}