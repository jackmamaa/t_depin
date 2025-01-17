import { FaAngleDown, FaAngleUp } from 'react-icons/fa'

export type SortField = string
export type SortOrder = 'asc' | 'desc'

export interface SortConfig {
  field: SortField
  order: SortOrder
}

interface SortableTableProps {
  field: SortField
  label: string
  sortConfig: SortConfig
  onSort: (field: SortField) => void
  className?: string
}

export default function SortableTable({
  field,
  label,
  sortConfig,
  onSort,
  className = ''
}: SortableTableProps) {
  const isCurrentField = sortConfig.field === field
  
  return (
    <th 
      onClick={() => onSort(field)}
      className={`cursor-pointer ${className}`}
    >
      <div className="flex items-center gap-2">
        {label}
        <div className="flex flex-col items-center border-base-200 border-l pl-2 text-xs">
          <FaAngleUp 
            className={`mb-[2px] ${
              isCurrentField && sortConfig.order === 'asc' 
                ? 'text-primary' 
                : 'text-base-content/30'
            }`}
          />
          <FaAngleDown 
            className={`mt-[2px] ${
              isCurrentField && sortConfig.order === 'desc' 
                ? 'text-primary' 
                : 'text-base-content/30'
            }`}
          />
        </div>
      </div>
    </th>
  )
} 