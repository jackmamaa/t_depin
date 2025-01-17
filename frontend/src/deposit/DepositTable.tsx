import { useState, useMemo } from 'react'
import { DepositInfo } from '../hooks/useDeposit'
import { EditableText, SortableTable, ShowState, SortConfig, SortField, StateType } from '../components'

interface DepositTableProps {
  deposits: DepositInfo[]
  isDepositsLoading: boolean
  selectedDeposits: string[]
  onSelectAll: () => void
  onSelectDeposit: (depositId: string) => void
  onRowClick: (deposit: DepositInfo) => void
  selectedDeposit: DepositInfo | null
  truncateId: (id: string | number | undefined | null, start?: number, end?: number) => string
  onUpdateDepositName: (depositId: string, newName: string) => void
  tableHeaderRef?: React.RefObject<HTMLTableSectionElement>;
}

export default function DepositTable({
  deposits,
  isDepositsLoading,
  selectedDeposits,
  onSelectAll,
  onSelectDeposit,
  onRowClick,
  selectedDeposit,
  truncateId,
  onUpdateDepositName,
  tableHeaderRef,
}: DepositTableProps) {
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

  const sortedDeposits = useMemo(() => {
    return [...deposits].sort((a, b) => {
      const { field, order } = sortConfig
      
      let comparison = 0
      if (field === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '')
      } else if (field === 'states') {
        comparison = (a.state || '').localeCompare(b.state || '')
      } else if (field === 'amount') {
        comparison = (a.amount || 0) - (b.amount || 0)
      }
      
      return order === 'asc' ? comparison : -comparison
    })
  }, [deposits, sortConfig])

  return (
    <div className="w-full">
      <table className="table table-compact w-full">
        <thead ref={tableHeaderRef} className="sticky top-0 bg-base-100 z-10">
          <tr>
            <th className="w-[40px]">
              <input
                type="checkbox"
                className="checkbox"
                checked={deposits.length > 0 && selectedDeposits.length === deposits.length}
                onChange={onSelectAll}
              />
            </th>
            <SortableTable
              field="name"
              label="Name"
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <SortableTable
              field="states"
              label="States"
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <th>Deposit ID</th>
            <SortableTable
              field="amount"
              label="Amount"
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <SortableTable
              field="balance"
              label="Balance"
              sortConfig={sortConfig}
              onSort={handleSort}
            />
          </tr>
        </thead>
        <tbody>
          {isDepositsLoading ? (
            <tr>
              <td colSpan={6} className="text-center py-4">
                <div className="flex items-center justify-center">
                  <span className="loading loading-spinner loading-md"></span>
                  <span className="text-base-content/50 ml-2">Loading...</span>
                </div>
              </td>
            </tr>
          ) : sortedDeposits.length > 0 ? (
            sortedDeposits.map((deposit) => (
              <tr 
                key={deposit.deposit_id}
                data-deposit-id={deposit.deposit_id}
                className={`hover:bg-base-200 cursor-pointer ${
                  selectedDeposit?.deposit_id === deposit.deposit_id ? 'bg-base-200' : ''
                }`}
                onClick={() => onRowClick(deposit)}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={selectedDeposits.includes(deposit.deposit_id)}
                    onChange={() => onSelectDeposit(deposit.deposit_id)}
                  />
                </td>
                <td>
                  <EditableText
                    tag='Deposit'
                    value={deposit.name || ''}
                    onSave={(newName) => onUpdateDepositName(deposit.deposit_id, newName)}
                    disabled={deposit.state !== 'Active'}
                    names={deposits.map(d => d.name).filter((name): name is string => name !== undefined)}
                  />
                </td>
                <td>
                  <ShowState 
                    state={
                      deposit.state === 'Active' && deposit.expiration * 1000 < Date.now() 
                        ? 'Expired' 
                        : deposit.state as StateType
                    } 
                  />
                </td>
                <td className="font-mono">{truncateId(deposit.deposit_id)}</td>
                <td>{deposit.amount}</td>
                <td>{deposit.balance}</td>
              </tr>
            ))
          ) : (
            <tr><td colSpan={6} className="text-center text-base-content/50">No deposits found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
} 