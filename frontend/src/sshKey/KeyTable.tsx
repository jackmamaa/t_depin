import { SshKey } from './useKey'
import { SortableTable, EditableText, type SortConfig } from '../components'
import { useState, useMemo } from 'react'

interface KeyTableProps {
  keys: SshKey[]
  isKeysLoading: boolean
  selectedKeys: string[]
  onSelectAll: (event: React.ChangeEvent<HTMLInputElement>) => void
  onSelectKey: (keyId: string) => void
  onRowClick: (key: SshKey) => void
  selectedKey: SshKey | null
  onUpdateKey: (key: SshKey) => void
}

export default function KeyTable({
  keys,
  isKeysLoading,
  selectedKeys,
  onSelectAll,
  onSelectKey,
  onRowClick,
  selectedKey,
  onUpdateKey
}: KeyTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'name',
    order: 'asc'
  })

  const handleSort = (field: string) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }))
  }

  const sortedKeys = useMemo(() => {
    return [...keys].sort((a, b) => {
      const { field, order } = sortConfig
      
      let comparison = 0
      if (field === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '')
      }

      return order === 'asc' ? comparison : -comparison
    })
  }, [keys, sortConfig])

  return (
    <div className="w-full">
      <table className="table table-compact w-full">
        <thead className="sticky top-0 bg-base-100 z-10">
          <tr>
            <th className="w-8">
              <input 
                type="checkbox" 
                className="checkbox"
                checked={keys.length > 0 && selectedKeys.length === keys.length}
                onChange={onSelectAll}
              />
            </th>
            <SortableTable
              field="name"
              label="Name"
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <th>Key ID</th>
            <th>Created At</th>
          </tr>
        </thead>
        <tbody>
          {isKeysLoading ? (
            <tr>
              <td colSpan={4} className="text-center py-4">
                <div className="flex items-center justify-center">
                  <span className="loading loading-spinner loading-md"></span>
                  <span className="text-base-content/50 ml-2">Loading...</span>
                </div>
              </td>
            </tr>
          ) : sortedKeys.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center py-4">
                No keys found
              </td>
            </tr>
          ) : (
            sortedKeys.map(key => (
              <tr 
                key={key.key_id}
                onClick={() => onRowClick(key)}
                className={`cursor-pointer hover:bg-base-200 ${
                  selectedKey?.key_id === key.key_id ? 'bg-base-200' : ''
                }`}
              >
                <td onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={selectedKeys.includes(key.key_id)}
                    onChange={() => onSelectKey(key.key_id)}
                  />
                </td>
                <td>                  
                  <EditableText
                    tag='Key'
                    value={key.name || ''}
                    onSave={(newName) => onUpdateKey({...key, name: newName})}
                    names={keys.map(d => d.name).filter((name): name is string => name !== undefined)}
                  /></td>
                <td>{key.key_id}</td>
                <td>{new Date(key.created_at||0 * 1000).toLocaleString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
} 