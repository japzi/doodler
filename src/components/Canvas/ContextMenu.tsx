import { useEffect, useRef } from 'react'
import { useStore } from '../../store/useStore'
import './ContextMenu.css'

interface ContextMenuProps {
  x: number
  y: number
  onClose: () => void
}

export function ContextMenu({ x, y, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const selectedIds = useStore((s) => s.selectedIds)
  const objects = useStore((s) => s.objects)

  const selected = objects.filter((o) => selectedIds.has(o.id))
  const allLocked = selected.length > 0 && selected.every((o) => o.locked)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('pointerdown', handleClickOutside)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('pointerdown', handleClickOutside)
    }
  }, [onClose])

  const handleToggleLock = () => {
    useStore.getState().toggleLockObjects(selectedIds)
    onClose()
  }

  return (
    <div ref={ref} className="context-menu" style={{ left: x, top: y }}>
      <button className="context-menu__item" onClick={handleToggleLock}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {allLocked ? (
            <>
              <rect x="3" y="7" width="10" height="7" rx="1" />
              <path d="M5 7V5a3 3 0 016 0" />
            </>
          ) : (
            <>
              <rect x="3" y="7" width="10" height="7" rx="1" />
              <path d="M5 7V5a3 3 0 016 0v2" />
            </>
          )}
        </svg>
        {allLocked ? 'Unlock' : 'Lock'}
      </button>
    </div>
  )
}
