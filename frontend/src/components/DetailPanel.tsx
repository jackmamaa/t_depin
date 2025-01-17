import { ReactNode, useState, useRef, useEffect } from 'react'

interface Tab {
  key: string
  label: string
  content: ReactNode
}

interface DetailPanelProps {
  title: string
  tabs: Tab[]
  onClose: () => void
  onHeightChange?: (height: number) => void
  initialHeight?: number
}

export default function DetailPanel({
  title,
  tabs,
  onClose,
  onHeightChange,
  initialHeight = window.innerHeight * 0.4
}: DetailPanelProps) {
  const [panelHeight, setPanelHeight] = useState(initialHeight)
  const [isDragging, setIsDragging] = useState(false)
  const [activeTab, setActiveTab] = useState(tabs[0].key)
  
  const startYRef = useRef(0)
  const isDraggingRef = useRef(false)
  const initialHeightRef = useRef(0)

  useEffect(() => {
    onHeightChange?.(panelHeight)
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    setIsDragging(true)
    startYRef.current = e.clientY
    initialHeightRef.current = panelHeight
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      const deltaY = startYRef.current - e.clientY
      const newHeight = initialHeightRef.current + deltaY
      const height = Math.min(
        window.innerHeight * 0.7, 
        Math.max(window.innerHeight * 0.3, newHeight)
      )
      setPanelHeight(height)
      onHeightChange?.(height)
    }
    
    const handleMouseUp = () => {
      isDraggingRef.current = false
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div 
      className="absolute bottom-0 left-0 right-0 bg-base-200 border-t border-base-200"
      style={{ height: `${panelHeight}px` }}
    >
      <div 
        className={`absolute border-base-200 bg-primary/5 left-0 right-0 h-2 cursor-ns-resize ${isDragging ? 'bg-primary/15' : 'hover:bg-primary/10'}`}
        onMouseDown={handleMouseDown}
      >
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-1 rounded-full 
          ${isDragging ? 'bg-primary/50' : 'bg-base-content/20'}`} 
        />
      </div>
      
      <div className="flex flex-col h-full">
        <div className="border-b border-base-200">
          <div className="flex justify-between p-4">
            <h2 className="text-lg font-semibold text-primary">{title}</h2>
            <button onClick={onClose} className="font-bold text-base-content hover:text-primary">✕</button>
          </div>

          <div className="tabs tabs-bordered">
            {tabs.map(tab => (
              <a 
                key={tab.key}
                className={`tab tab-sm ${activeTab === tab.key ? 'tab-active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </a>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-base-200">
          {tabs.find(tab => tab.key === activeTab)?.content}
        </div>
      </div>
    </div>
  )
} 