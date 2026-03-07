import { useStore } from '../../store/useStore'
import { getRotatedBounds } from '../../utils/rotation'
import './SelectionActionBar.css'

export function SelectionActionBar() {
  const selectedIds = useStore((s) => s.selectedIds)
  const objects = useStore((s) => s.objects)
  const viewport = useStore((s) => s.viewport)

  if (selectedIds.size < 1) return null

  const selected = objects.filter((o) => selectedIds.has(o.id))
  if (selected.length < 1) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const obj of selected) {
    const rb = getRotatedBounds(obj)
    minX = Math.min(minX, rb.x)
    minY = Math.min(minY, rb.y)
    maxX = Math.max(maxX, rb.x + rb.width)
    maxY = Math.max(maxY, rb.y + rb.height)
  }

  const cx = (minX + maxX) / 2
  const screenX = cx * viewport.scale + viewport.offsetX
  const screenY = (maxY + 16) * viewport.scale + viewport.offsetY

  const showMulti = selected.length >= 2
  const showDistribute = selected.length >= 3
  const hasGroup = selected.some((o) => o.type === 'group')

  return (
    <div
      className="selection-action-bar"
      style={{ left: screenX, top: screenY }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Z-order controls — always visible */}
      <button className="selection-action-bar__button" onClick={() => useStore.getState().bringToFront(selectedIds)} title="Bring to Front">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <rect x="1" y="7" width="7" height="7" rx="0.5" fill="none" />
          <rect x="8" y="2" width="7" height="7" rx="0.5" fill="currentColor" stroke="currentColor" />
        </svg>
      </button>
      <button className="selection-action-bar__button" onClick={() => useStore.getState().bringForward(selectedIds)} title="Bring Forward">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <polyline points="4,10 8,6 12,10" />
        </svg>
      </button>
      <button className="selection-action-bar__button" onClick={() => useStore.getState().sendBackward(selectedIds)} title="Send Backward">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <polyline points="4,6 8,10 12,6" />
        </svg>
      </button>
      <button className="selection-action-bar__button" onClick={() => useStore.getState().sendToBack(selectedIds)} title="Send to Back">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <rect x="8" y="7" width="7" height="7" rx="0.5" fill="none" />
          <rect x="1" y="2" width="7" height="7" rx="0.5" fill="currentColor" stroke="currentColor" />
        </svg>
      </button>

      {/* Group / Ungroup */}
      {(showMulti || hasGroup) && (
        <>
          <div className="selection-action-bar__divider" />
          {showMulti && (
            <button className="selection-action-bar__button" onClick={() => useStore.getState().groupObjects(selectedIds)} title="Group (Ctrl+G)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="1" width="6" height="6" rx="1" />
                <rect x="9" y="9" width="6" height="6" rx="1" />
                <path d="M4 10v2a2 2 0 002 2h2" strokeDasharray="2 1.5" />
                <path d="M12 6V4a2 2 0 00-2-2h-2" strokeDasharray="2 1.5" />
              </svg>
            </button>
          )}
          {hasGroup && (
            <button className="selection-action-bar__button" onClick={() => useStore.getState().ungroupObjects(selectedIds)} title="Ungroup (Ctrl+Shift+G)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="1" width="6" height="6" rx="1" />
                <rect x="9" y="9" width="6" height="6" rx="1" />
                <line x1="6" y1="10" x2="10" y2="6" strokeDasharray="2 1.5" />
              </svg>
            </button>
          )}
        </>
      )}

      {showMulti && (
        <>
          <div className="selection-action-bar__divider" />
          {/* Match size */}
          <button className="selection-action-bar__button" onClick={() => useStore.getState().matchSize(selectedIds, 'width')} title="Same Width">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="2" x2="1" y2="14" /><line x1="15" y1="2" x2="15" y2="14" />
              <line x1="4" y1="8" x2="12" y2="8" /><path d="M4 5.5L4 10.5" /><path d="M12 5.5L12 10.5" />
              <polyline points="6,6 4,8 6,10" /><polyline points="10,6 12,8 10,10" />
            </svg>
          </button>
          <button className="selection-action-bar__button" onClick={() => useStore.getState().matchSize(selectedIds, 'height')} title="Same Height">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="2" y1="1" x2="14" y2="1" /><line x1="2" y1="15" x2="14" y2="15" />
              <line x1="8" y1="4" x2="8" y2="12" /><path d="M5.5 4L10.5 4" /><path d="M5.5 12L10.5 12" />
              <polyline points="6,6 8,4 10,6" /><polyline points="6,10 8,12 10,10" />
            </svg>
          </button>
          <button className="selection-action-bar__button" onClick={() => useStore.getState().matchSize(selectedIds, 'both')} title="Same Size">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="1" width="14" height="14" rx="1" strokeDasharray="3 2" />
              <rect x="4" y="4" width="8" height="8" rx="1" />
            </svg>
          </button>
          <div className="selection-action-bar__divider" />
          {/* Alignment */}
          <button className="selection-action-bar__button" onClick={() => useStore.getState().alignObjects(selectedIds, 'left')} title="Align Left">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="1" x2="1" y2="15" />
              <rect x="3" y="3" width="10" height="3" rx="0.5" fill="currentColor" stroke="none" />
              <rect x="3" y="10" width="6" height="3" rx="0.5" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <button className="selection-action-bar__button" onClick={() => useStore.getState().alignObjects(selectedIds, 'centerH')} title="Align Center Horizontally">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="8" y1="1" x2="8" y2="15" />
              <rect x="3" y="3" width="10" height="3" rx="0.5" fill="currentColor" stroke="none" />
              <rect x="5" y="10" width="6" height="3" rx="0.5" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <button className="selection-action-bar__button" onClick={() => useStore.getState().alignObjects(selectedIds, 'right')} title="Align Right">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="15" y1="1" x2="15" y2="15" />
              <rect x="3" y="3" width="10" height="3" rx="0.5" fill="currentColor" stroke="none" />
              <rect x="7" y="10" width="6" height="3" rx="0.5" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <button className="selection-action-bar__button" onClick={() => useStore.getState().alignObjects(selectedIds, 'top')} title="Align Top">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="1" x2="15" y2="1" />
              <rect x="3" y="3" width="3" height="10" rx="0.5" fill="currentColor" stroke="none" />
              <rect x="10" y="3" width="3" height="6" rx="0.5" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <button className="selection-action-bar__button" onClick={() => useStore.getState().alignObjects(selectedIds, 'centerV')} title="Align Center Vertically">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="8" x2="15" y2="8" />
              <rect x="3" y="3" width="3" height="10" rx="0.5" fill="currentColor" stroke="none" />
              <rect x="10" y="5" width="3" height="6" rx="0.5" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <button className="selection-action-bar__button" onClick={() => useStore.getState().alignObjects(selectedIds, 'bottom')} title="Align Bottom">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="15" x2="15" y2="15" />
              <rect x="3" y="3" width="3" height="10" rx="0.5" fill="currentColor" stroke="none" />
              <rect x="10" y="7" width="3" height="6" rx="0.5" fill="currentColor" stroke="none" />
            </svg>
          </button>
          {showDistribute && (
            <>
              <div className="selection-action-bar__divider" />
              <button className="selection-action-bar__button" onClick={() => useStore.getState().distributeObjects(selectedIds, 'horizontal')} title="Distribute Horizontally">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="1" y1="1" x2="1" y2="15" /><line x1="8" y1="1" x2="8" y2="15" /><line x1="15" y1="1" x2="15" y2="15" />
                  <rect x="3" y="5" width="3" height="6" rx="0.5" fill="currentColor" stroke="none" />
                  <rect x="10" y="5" width="3" height="6" rx="0.5" fill="currentColor" stroke="none" />
                </svg>
              </button>
              <button className="selection-action-bar__button" onClick={() => useStore.getState().distributeObjects(selectedIds, 'vertical')} title="Distribute Vertically">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="1" y1="1" x2="15" y2="1" /><line x1="1" y1="8" x2="15" y2="8" /><line x1="1" y1="15" x2="15" y2="15" />
                  <rect x="5" y="3" width="6" height="3" rx="0.5" fill="currentColor" stroke="none" />
                  <rect x="5" y="10" width="6" height="3" rx="0.5" fill="currentColor" stroke="none" />
                </svg>
              </button>
            </>
          )}
        </>
      )}

      <div className="selection-action-bar__divider" />
      {/* Lock / Unlock */}
      {(() => {
        const allLocked = selected.every((o) => o.locked)
        return (
          <button
            className="selection-action-bar__button"
            onClick={() => useStore.getState().toggleLockObjects(selectedIds)}
            title={allLocked ? 'Unlock' : 'Lock'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="7" width="10" height="7" rx="1" />
              {allLocked ? (
                <path d="M5 7V5a3 3 0 016 0v2" />
              ) : (
                <path d="M5 7V5a3 3 0 016 0" transform="rotate(-20 8 5)" />
              )}
            </svg>
          </button>
        )
      })()}
      <button
        className="selection-action-bar__button"
        onClick={() => useStore.getState().deleteObjects(selectedIds)}
        title="Delete (⌫)"
        disabled={selected.every((o) => o.locked)}
        style={selected.every((o) => o.locked) ? { opacity: 0.3, cursor: 'not-allowed' } : undefined}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 4h12" />
          <path d="M5 4V2.5a1 1 0 011-1h4a1 1 0 011 1V4" />
          <path d="M3 4l1 10.5a1 1 0 001 .5h6a1 1 0 001-.5L13 4" />
        </svg>
      </button>
    </div>
  )
}
