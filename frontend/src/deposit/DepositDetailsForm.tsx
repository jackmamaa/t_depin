import { DepositInfo } from '../hooks/useDeposit'
import { InstanceInfo } from '../hooks/useInstance'
import { DetailPanel, CopyButton } from '../components'
import { Link } from 'react-router-dom'

interface DepositDetailsProps {
  instances: InstanceInfo[]
  deposit: DepositInfo | null
  networkName: string
  onClose: () => void
  onHeightChange?: (height: number) => void
}

export default function DepositDetails({instances, deposit, networkName, onClose, onHeightChange}: DepositDetailsProps) {
  if (!deposit) return null
  const hashScan = networkName 
    === 'holesky' 
    ? `https://${networkName}.etherscan.io/tx` 
    : `https://${networkName}scan.com/tx/`

  const basicInfo = (
    <div className="space-y-6">
      <div className="bg-base-200 p-4 rounded-lg">
        <div className="space-y-2">
          <div className="flex">
            <span className="text-sm w-24 font-semibold mb-2">Name:</span>
            <span className="text-sm">{deposit.name}</span>
          </div>
          <div className="flex">
            <span className="text-sm w-24 font-semibold mb-2">Deposit ID:</span>
            <span className="text-sm">{deposit.deposit_id}</span>
            <CopyButton text={deposit.deposit_id}/>
          </div>
          <div className="flex">
            <span className="text-sm w-24 font-semibold mb-2">Tx hash:</span>
            <a href={`${hashScan}/${deposit.tx_hash}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-sm text-primary hover:underline"
            >
              {deposit.tx_hash || 'pending'}
            </a>
            <CopyButton text={deposit.tx_hash}/>
          </div>
          <div className="flex">
            <span className="text-sm w-24 font-semibold mb-2">Amount:</span>
            <span className="text-sm">{deposit.amount}</span>
          </div>
          <div className="flex">
            <span className="text-sm w-24 font-semibold mb-2">Expiration:</span>
            <span className="text-sm">
              {new Date(deposit.expiration * 1000).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  const allocationInfo = (
    <div className="space-y-6">
      <div className="bg-base-200 p-4 rounded-lg">
        <div className="space-y-2">
            <div className="flex">
                <span className="text-sm w-24 font-semibold mb-2">Allocation ID:</span>
                <span className="text-sm">{deposit.allocation_id || 'pending'}</span>
                <CopyButton text={deposit.allocation_id}/>
            </div>
            <div className="flex">
                <span className="text-sm w-24 font-semibold mb-2">Balance:</span>
                <span className="text-sm">{deposit.balance}</span>
            </div>
            <div className="flex">
                <span className="text-sm w-24 font-semibold mb-2">Instances:</span>
                <span className="text-sm">
                  {instances
                    .filter(instance => instance.allocation_id === deposit.allocation_id)
                    .map((instance, index) => (
                      <div key={index} className="flex">
                        <Link to={`/instance/${instance.agreement_id}`} className="text-primary text-sm hover:underline">
                          {instance.agreement_id}
                        </Link>
                        <span className="text-sm text-base-content/50">({instance.name}:{instance.state})</span>
                      </div>
                    ))
                  }
                </span>
            </div>
        </div>
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
      key: 'allocation',
      label: 'Allocation',
      content: allocationInfo
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