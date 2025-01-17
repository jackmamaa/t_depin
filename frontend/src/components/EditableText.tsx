import { useState, useEffect, useRef } from 'react'
import { FaCheck, FaEdit, FaTimes } from 'react-icons/fa'
import PopupMessage from './PopupWindow'

interface EditableTextProps {
  tag?: string
  value: string
  onSave: (newValue: string) => void
  disabled?: boolean
  names: string[]
}

export default function EditableText({ 
  tag,
  value, 
  onSave, 
  disabled = false,
  names,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [nameWarning, setNameWarning] = useState<string>('');
  const [showPopup, setShowPopup] = useState(false);
  const editContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isEditing &&
        editContainerRef.current &&
        !editContainerRef.current.contains(event.target as Node)
      ) {
        handleCancel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing]);

  const handleSave = () => {
    if (editValue !== value) {
      if (names.includes(editValue)) {
        setShowPopup(true)
      } else {
        onSave(editValue)
      }
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setShowPopup(false)
    setIsEditing(false)
    setEditValue(value)
  }

  if (isEditing) {
    return (
      <div ref={editContainerRef} className="relative flex items-center">
        <input
          type="text"
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value)
            setNameWarning('')
          }}
          className={`outline-none bg-transparent w-16`}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSave()
            } else if (e.key === 'Escape') {
              handleCancel()
            }
          }}
          autoFocus
        />
        <div className="absolute right-0 flex items-center gap-2">
          <FaCheck
            className="hover:text-green-700 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              handleSave()
            }}
          />
          <FaTimes
            className="hover:text-red-700 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              handleCancel()
            }}
          />
        </div>
        {nameWarning && <p className="text-red-500 text-sm">{nameWarning}</p>}
      </div>
    )
  }

  return (
    <>
      {showPopup && (
        <PopupMessage
          title="Unchanged"
          content={
            <span>
              The <strong>{tag}</strong> name has not been changed. <br/>
              Because the name <strong>{editValue}</strong> already exists.
            </span>
          }
          onClose={() => handleCancel()}
          onConfirm={() => { handleCancel()}}
          confirmText="OK"
        />
      )}
      <div className="flex items-center gap-2">
        <span>{value}</span>
        {!disabled && (
          <FaEdit 
            className="text-primary hover:text-primary/80 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
          />
        )}
      </div>
    </>
  )
} 