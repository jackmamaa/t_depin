import { useState, useMemo } from 'react'
import { VpnInfo } from '../hooks/useVPN'
import { EditableText, SortableTable, ShowState, type StateType, SortConfig, SortField } from '../components'

interface VpnTableProps {
  vpns: VpnInfo[]
  isVpnsLoading: boolean
  selectedVpns: string[]
  onSelectAll: (event: React.ChangeEvent<HTMLInputElement>) => void
  onSelectVpn: (vpnId: string) => void
  onRowClick: (vpn: VpnInfo) => void
  selectedVpn: VpnInfo | null
  truncateId: (id: string | number | undefined | null, start?: number, end?: number) => string
  onUpdateVpnName: (vpnId: string, newName: string) => void
  tableHeaderRef?: React.RefObject<HTMLTableSectionElement>
}

export default function VPNTable({
  vpns,
  isVpnsLoading,
  selectedVpns,
  onSelectAll,
  onSelectVpn,
  onRowClick,
  selectedVpn,
  truncateId,
  onUpdateVpnName,
  tableHeaderRef
}: VpnTableProps) {
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

  const sortedVpns = useMemo(() => {
    return [...vpns].sort((a, b) => {
      const { field, order } = sortConfig
      
      let comparison = 0
      if (field === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '')
      } else if (field === 'state') {
        comparison = (a.state || '').localeCompare(b.state || '')
      } else if (field === 'cidr') {
        comparison = (a.cidr || '').localeCompare(b.cidr || '')
      }

      return order === 'asc' ? comparison : -comparison
    })
  }, [vpns, sortConfig])

  return (
    <div className="w-full">
      <table className="table table-compact w-full">
        <thead ref={tableHeaderRef} className="sticky top-0 bg-base-100 z-10">
          <tr>
            <th>
              <input 
                type="checkbox" 
                checked={vpns.length > 0 && selectedVpns.length === vpns.length}
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
              field="state"
              label="State"
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <th>VPN ID</th>
            <SortableTable
              field="cidr"
              label="CIDR"
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <th>Created At</th>
          </tr>
        </thead>
        <tbody>
          {isVpnsLoading ? (
            <tr>
              <td colSpan={6} className="text-center py-4">
                <div className="flex items-center justify-center">
                  <span className="loading loading-spinner loading-md"></span>
                  <span className="text-base-content/50 ml-2">Loading...</span>
                </div>
              </td>
            </tr>
          ) : sortedVpns.length > 0 ? (
            sortedVpns.map((vpn) => (
              <tr 
                key={vpn.vpn_id}
                data-vpn-id={vpn.vpn_id}
                className={`hover:bg-base-200 cursor-pointer ${
                  selectedVpn?.vpn_id === vpn.vpn_id ? 'bg-base-200' : ''
                }`}
                onClick={() => onRowClick(vpn)}
              >
                <td onClick={e => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    checked={selectedVpns.includes(vpn.vpn_id)}
                    onChange={() => onSelectVpn(vpn.vpn_id)}
                    className="checkbox"
                  />
                </td>
                <td>
                  <EditableText
                    tag='VPN'
                    value={vpn.name}
                    onSave={(newName) => onUpdateVpnName(vpn.vpn_id, newName)}
                    disabled={vpn.state === 'Creating' || vpn.state === 'Terminating'}
                    names={vpns.map(d => d.name).filter((name): name is string => name !== undefined)}
                  />
                </td>
                <td>
                  <ShowState state={vpn.state as StateType} />
                </td>
                <td>{truncateId(vpn.vpn_id)}</td>
                <td>{vpn.cidr}</td>
                <td>{new Date(vpn.created_at|| 0 * 1000).toLocaleString()}</td>
              </tr>
            ))
          ) : (
            <tr><td colSpan={5} className="text-center text-base-content/50">No vpns found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
} 