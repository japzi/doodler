import { useStore } from '../../store/useStore'
import './SelectionActionBar.css'

export function SelectionActionBar() {
  const selectedIds = useStore((s) => s.selectedIds)
  const objects = useStore((s) => s.objects)
  const viewport = useStore((s) => s.viewport)

  if (selectedIds.size < 2) return null

  const selected = objects.filter((o) => selectedIds.has(o.id))
  if (selected.length < 2) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const obj of selected) {
    const bb = obj.boundingBox
    const ox = obj.position.x
    const oy = obj.position.y
    minX = Math.min(minX, bb.x + ox)
    minY = Math.min(minY, bb.y + oy)
    maxX = Math.max(maxX, bb.x + bb.width + ox)
    maxY = Math.max(maxY, bb.y + bb.height + oy)
  }

  const cx = (minX + maxX) / 2
  const screenX = cx * viewport.scale + viewport.offsetX
  const screenY = (maxY + 16) * viewport.scale + viewport.offsetY

  const handleSize = (mode: 'width' | 'height' | 'both') => {
    useStore.getState().matchSize(selectedIds, mode)
  }

  const handleAlign = (alignment: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom') => {
    useStore.getState().alignObjects(selectedIds, alignment)
  }

  const handleDistribute = (axis: 'horizontal' | 'vertical') => {
    useStore.getState().distributeObjects(selectedIds, axis)
  }

  const showDistribute = selected.length >= 3

  return (
    <div
      className="selection-action-bar"
      style={{ left: screenX, top: screenY }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button className="selection-action-bar__button" onClick={() => handleSize('width')} title="Same Width">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="1" y1="2" x2="1" y2="14" /><line x1="15" y1="2" x2="15" y2="14" />
          <line x1="4" y1="8" x2="12" y2="8" /><path d="M4 5.5L4 10.5" /><path d="M12 5.5L12 10.5" />
          <polyline points="6,6 4,8 6,10" /><polyline points="10,6 12,8 10,10" />
        </svg>
      </button>
      <button className="selection-action-bar__button" onClick={() => handleSize('height')} title="Same Height">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="2" y1="1" x2="14" y2="1" /><line x1="2" y1="15" x2="14" y2="15" />
          <line x1="8" y1="4" x2="8" y2="12" /><path d="M5.5 4L10.5 4" /><path d="M5.5 12L10.5 12" />
          <polyline points="6,6 8,4 10,6" /><polyline points="6,10 8,12 10,10" />
        </svg>
      </button>
      <button className="selection-action-bar__button" onClick={() => handleSize('both')} title="Same Size">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="1" width="14" height="14" rx="1" strokeDasharray="3 2" />
          <rect x="4" y="4" width="8" height="8" rx="1" />
        </svg>
      </button>
      <div className="selection-action-bar__divider" />
      <button className="selection-action-bar__button" onClick={() => handleAlign('left')} title="Align Left">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="1" y1="1" x2="1" y2="15" />
          <rect x="3" y="3" width="10" height="3" rx="0.5" fill="currentColor" stroke="none" />
          <rect x="3" y="10" width="6" height="3" rx="0.5" fill="currentColor" stroke="none" />
        </svg>
      </button>
      <button className="selection-action-bar__button" onClick={() => handleAlign('centerH')} title="Align Center Horizontally">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="8" y1="1" x2="8" y2="15" />
          <rect x="3" y="3" width="10" height="3" rx="0.5" fill="currentColor" stroke="none" />
          <rect x="5" y="10" width="6" height="3" rx="0.5" fill="currentColor" stroke="none" />
        </svg>
      </button>
      <button className="selection-action-bar__button" onClick={() => handleAlign('right')} title="Align Right">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="15" y1="1" x2="15" y2="15" />
          <rect x="3" y="3" width="10" height="3" rx="0.5" fill="currentColor" stroke="none" />
          <rect x="7" y="10" width="6" height="3" rx="0.5" fill="currentColor" stroke="none" />
        </svg>
      </button>
      <button className="selection-action-bar__button" onClick={() => handleAlign('top')} title="Align Top">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="1" y1="1" x2="15" y2="1" />
          <rect x="3" y="3" width="3" height="10" rx="0.5" fill="currentColor" stroke="none" />
          <rect x="10" y="3" width="3" height="6" rx="0.5" fill="currentColor" stroke="none" />
        </svg>
      </button>
      <button className="selection-action-bar__button" onClick={() => handleAlign('centerV')} title="Align Center Vertically">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="1" y1="8" x2="15" y2="8" />
          <rect x="3" y="3" width="3" height="10" rx="0.5" fill="currentColor" stroke="none" />
          <rect x="10" y="5" width="3" height="6" rx="0.5" fill="currentColor" stroke="none" />
        </svg>
      </button>
      <button className="selection-action-bar__button" onClick={() => handleAlign('bottom')} title="Align Bottom">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="1" y1="15" x2="15" y2="15" />
          <rect x="3" y="3" width="3" height="10" rx="0.5" fill="currentColor" stroke="none" />
          <rect x="10" y="7" width="3" height="6" rx="0.5" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {showDistribute && (
        <>
          <div className="selection-action-bar__divider" />
          <button className="selection-action-bar__button" onClick={() => handleDistribute('horizontal')} title="Distribute Horizontally">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="1" x2="1" y2="15" /><line x1="8" y1="1" x2="8" y2="15" /><line x1="15" y1="1" x2="15" y2="15" />
              <rect x="3" y="5" width="3" height="6" rx="0.5" fill="currentColor" stroke="none" />
              <rect x="10" y="5" width="3" height="6" rx="0.5" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <button className="selection-action-bar__button" onClick={() => handleDistribute('vertical')} title="Distribute Vertically">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="1" x2="15" y2="1" /><line x1="1" y1="8" x2="15" y2="8" /><line x1="1" y1="15" x2="15" y2="15" />
              <rect x="5" y="3" width="6" height="3" rx="0.5" fill="currentColor" stroke="none" />
              <rect x="5" y="10" width="6" height="3" rx="0.5" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </>
      )}
    </div>
  )
}
