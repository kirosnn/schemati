import { useEffect, useRef } from 'react'
import { Copy, Trash2, Edit, Palette, Maximize2, Share2 } from 'lucide-react'

export default function ContextMenu({ x, y, onClose, options }) {
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose()
      }
    }

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="fixed bg-card border border-border rounded-lg shadow-2xl py-1 z-50 min-w-[200px]"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      {options.map((option, index) => (
        option.separator ? (
          <div key={index} className="h-px bg-border my-1" />
        ) : (
          <button
            key={index}
            onClick={() => {
              option.onClick()
              onClose()
            }}
            className="w-full px-3 py-2 text-sm text-left hover:bg-accent flex items-center gap-3 transition-colors"
            disabled={option.disabled}
          >
            {option.icon && <option.icon className="h-4 w-4" />}
            <span>{option.label}</span>
            {option.shortcut && (
              <span className="ml-auto text-xs text-muted-foreground">
                {option.shortcut}
              </span>
            )}
          </button>
        )
      ))}
    </div>
  )
}
