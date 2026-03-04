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
      <button className="selection-action-bar__button" onClick={() => handleSize('width')}>
        Same Width
      </button>
      <button className="selection-action-bar__button" onClick={() => handleSize('height')}>
        Same Height
      </button>
      <button className="selection-action-bar__button" onClick={() => handleSize('both')}>
        Same Size
      </button>
      <div className="selection-action-bar__divider" />
      <button className="selection-action-bar__button" onClick={() => handleAlign('left')}>
        Left
      </button>
      <button className="selection-action-bar__button" onClick={() => handleAlign('centerH')}>
        Center H
      </button>
      <button className="selection-action-bar__button" onClick={() => handleAlign('right')}>
        Right
      </button>
      <button className="selection-action-bar__button" onClick={() => handleAlign('top')}>
        Top
      </button>
      <button className="selection-action-bar__button" onClick={() => handleAlign('centerV')}>
        Center V
      </button>
      <button className="selection-action-bar__button" onClick={() => handleAlign('bottom')}>
        Bottom
      </button>
      {showDistribute && (
        <>
          <div className="selection-action-bar__divider" />
          <button className="selection-action-bar__button" onClick={() => handleDistribute('horizontal')}>
            Space H
          </button>
          <button className="selection-action-bar__button" onClick={() => handleDistribute('vertical')}>
            Space V
          </button>
        </>
      )}
    </div>
  )
}
