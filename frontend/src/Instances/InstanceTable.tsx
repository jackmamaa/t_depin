import { useState, useMemo } from 'react'
import { InstanceInfo } from '../hooks/useInstance'
import { DepositInfo } from '../hooks/useDeposit'
import { EditableText, SortableTable, ShowState, type StateType, SortConfig, SortField } from '../components'
import InstanceFailureDetails from './InstanceFailureDetails'
import { FaRegQuestionCircle } from 'react-icons/fa'

interface InstanceTableProps {
  instances: InstanceInfo[]
  deposits: DepositInfo[]
  isInstancesLoading?: boolean
  selectedInstances: string[]
  onSelectAll: (event: React.ChangeEvent<HTMLInputElement>) => void
  onSelectInstance: (instanceId: string) => void
  onRowClick: (instance: InstanceInfo) => void
  selectedInstance: InstanceInfo | null
  truncateId: (id: string | number | undefined | null, start?: number, end?: number) => string
  onUpdateInstanceName: (agreementId: string, newName: string) => void
  onRetryInstance?: (instance: InstanceInfo) => void;
  tableHeaderRef?: React.RefObject<HTMLTableSectionElement>;
}

export default function InstanceTable({
  instances,
  isInstancesLoading,
  selectedInstances,
  onSelectAll,
  onSelectInstance,
  onRowClick,
  selectedInstance,
  truncateId,
  onUpdateInstanceName,
  onRetryInstance,
  tableHeaderRef,
}: InstanceTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'name',
    order: 'asc'
  })

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }))
  }

  const [failedInstance, setFailedInstance] = useState<InstanceInfo | null>(null);

  const sortedInstances = useMemo(() => {
    return [...instances].sort((a, b) => {
      const { field, order } = sortConfig

      let comparison = 0
      if (field === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '')
      } else if (field === 'status') {
        comparison = (a.state || '').localeCompare(b.state || '')
      }

      return order === 'asc' ? comparison : -comparison
    })
  }, [instances, sortConfig])

  return (
    <div className="w-full">
      {failedInstance && (
        <InstanceFailureDetails
          instance={failedInstance}
          onClose={() => setFailedInstance(null)}
          onRetry={(instance) => {
            setFailedInstance(null);
            onRetryInstance?.(instance);
          }}
        />
      )}
      <table className="table table-compact w-full">
        <thead ref={tableHeaderRef} className="sticky top-0 bg-base-100 z-10">
          <tr>
            <th className="w-[40px]">
              <input 
                type="checkbox" 
                checked={instances.length > 0 && selectedInstances.length === instances.length}
                onChange={onSelectAll}
                className="checkbox"
              />
            </th>
            <SortableTable
              field="name"
              label="Name"
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <SortableTable
              field="status"
              label="Status"
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <th>Allocation ID</th>
            <th>Provider ID</th>
            <th>Image Tag</th>
          </tr>
        </thead>
        <tbody>
          {isInstancesLoading ? (
            <tr>
              <td colSpan={8} className="text-center py-4">
                <div className="flex items-center justify-center">
                  <span className="loading loading-spinner loading-md"></span>
                  <span className="text-base-content/50 ml-2">Loading...</span>
                </div>
              </td>
            </tr>
          ) : (
            sortedInstances.length > 0 ? (
              sortedInstances.map((instance) => (
                <tr 
                  key={instance.agreement_id}
                  data-instance-id={instance.agreement_id}
                  className={`hover:bg-base-200 cursor-pointer ${
                    selectedInstance?.agreement_id === instance.agreement_id ? 'bg-base-200' : ''
                  }`}
                  onClick={() => onRowClick(instance)}
                >
                  <td onClick={e => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="checkbox"
                      checked={selectedInstances.includes(instance.agreement_id)}
                      onChange={() => onSelectInstance(instance.agreement_id)}
                    />
                  </td>
                  <td>
                    <EditableText
                      tag='Instance'
                      value={instance.name || ''}
                      onSave={(newName) => onUpdateInstanceName(instance.agreement_id, newName)}
                      disabled={instance.state !== 'Active'}
                      names={instances.map(d => d.name).filter((name): name is string => name !== undefined)}
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <ShowState state={instance.state as StateType} />
                        {instance.state === 'CreateFailed' && (
                          <FaRegQuestionCircle 
                            onClick={(e) => {
                              e.stopPropagation();
                              setFailedInstance(instance);
                            }}
                          />
                        )}
                    </div>
                  </td>
                  <td>{instance.allocation_id ? truncateId(instance.allocation_id) : '-'}</td>
                  <td>
                    <a href={`https://stats.golem.network/network/provider/${instance.provider_id}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-sm text-primary hover:underline"
                    >
                      {instance.provider_id ? truncateId(instance.provider_id) : '-'}
                    </a>
                  </td>
                  <td>{instance.image_tag}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="text-center text-base-content/50">No instances found</td></tr>
            )
          )}
        </tbody>
      </table>
    </div>
  )
} 