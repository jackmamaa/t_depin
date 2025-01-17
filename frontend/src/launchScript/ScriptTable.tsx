import { useState, useMemo } from 'react'
import { LaunchScript } from './useScript'
import { SortableTable, EditableText, type SortConfig } from '../components'

interface ScriptTableProps {
  scripts: LaunchScript[]
  isScriptsLoading: boolean
  selectedScripts: string[]
  onSelectAll: (event: React.ChangeEvent<HTMLInputElement>) => void
  onSelectScript: (scriptId: string, checked: boolean) => void
  onRowClick: (script: LaunchScript) => void
  selectedScript: LaunchScript | null
  onUpdateScriptName: (script: LaunchScript) => void
}

export default function ScriptTable({
  scripts,
  isScriptsLoading,
  selectedScripts,
  onSelectAll,
  onSelectScript,
  onRowClick,
  selectedScript,
  onUpdateScriptName
}: ScriptTableProps) {
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

  const sortedScripts = useMemo(() => {
    return [...scripts].sort((a, b) => {
      const { field, order } = sortConfig
      
      let comparison = 0
      if (field === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '')
      }

      return order === 'asc' ? comparison : -comparison
    })
  }, [scripts, sortConfig])

  return (
    <div className="w-full">
      <table className="table table-compact w-full">
        <thead className="sticky top-0 bg-base-100 z-10">
          <tr>
            <th className="w-8">
              <input 
                type="checkbox" 
                className="checkbox"
                checked={scripts.length > 0 && selectedScripts.length === scripts.length}
                onChange={onSelectAll}
              />
            </th>
            <SortableTable
              field="name"
              label="Name"
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <th>Script ID</th>
            <th>Updated At</th>
          </tr>
        </thead>
        <tbody>
          {isScriptsLoading ? (
            <tr>
              <td colSpan={4} className="text-center py-4">
                <div className="flex items-center justify-center">
                  <span className="loading loading-spinner loading-md"></span>
                  <span className="text-base-content/50 ml-2">Loading...</span>
                </div>
              </td>
            </tr>
          ) : sortedScripts.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center py-4">
                No scripts found
              </td>
            </tr>
          ) : (
            sortedScripts.map(script => (
              <tr 
                key={script.script_id}
                onClick={() => onRowClick(script)}
                className={`cursor-pointer hover:bg-base-200 ${
                  selectedScript?.script_id === script.script_id ? 'bg-base-200' : ''
                }`}
              >
                <td onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={selectedScripts.includes(script.script_id)}
                    onChange={(e) => onSelectScript(script.script_id, e.target.checked)}
                  />
                </td>
                <td>                  
                  <EditableText
                    tag='Script'
                    value={script.name || ''}
                    onSave={(newName) => onUpdateScriptName({...script, name: newName})}
                    names={scripts.map(d => d.name).filter((name): name is string => name !== undefined)}
                    disabled={script.tags === 'default'}
                  /></td>
                <td>{script.script_id}</td>
                <td>{new Date(script.updated_at||0 * 1000).toLocaleString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
