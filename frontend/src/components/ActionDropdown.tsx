import { FaAngleDown } from 'react-icons/fa'
import { useRef, useEffect } from 'react'

interface ActionItem {
  label: string
  onClick: () => void
  disabled?: boolean
  className?: string
}

export interface ActionDropdownProps {
  items: ActionItem[]
  disabled?: boolean
}

export const ActionDropdown = ({ items, disabled = false }: ActionDropdownProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleItemClick = (item: ActionItem) => async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (dropdownRef.current) {
      const details = dropdownRef.current.querySelector('details')
      if (details) {
        details.open = false
      }
      if (item.disabled) {
        return
      }
    }

    await Promise.resolve(item.onClick())
  }

  useEffect(() => {
    const details = dropdownRef.current?.querySelector('details')
    if (!details) return

    const handleClickOutside = (event: MouseEvent) => {
      if (!details.contains(event.target as Node) && details.open) {
        details.open = false
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [])

  return (
    <div className="dropdown dropdown-end" ref={dropdownRef}>
      <details className="dropdown">
        <summary 
          className={`btn btn-primary btn-sm flex items-center ${
            disabled ? 'btn-disabled' : ''
          }`}
        >
          <span>Actions</span>
          <FaAngleDown />
        </summary>
        <ul className="dropdown-content menu shadow-lg bg-base-200 rounded-box py-2 z-50">
          {items.map((item, index) => (
            <li key={index}>
              <a 
                href="#"
                onClick={handleItemClick(item)}
                className={`px-4 py-2 hover:bg-base-300 ${
                  item.disabled 
                    ? 'text-base-content/50 cursor-not-allowed' 
                    : item.className || 'text-base-content hover:text-base-content'
                }`}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
} 