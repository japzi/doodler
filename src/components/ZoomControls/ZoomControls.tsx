import { useStore } from '../../store/useStore'
import './ZoomControls.css'

const ZOOM_FACTOR = 1.1
const MIN_SCALE = 0.1
const MAX_SCALE = 10

export function ZoomControls() {
  const scale = useStore((s) => s.viewport.scale)

  const zoomTo = (newScale: number) => {
    const { viewport } = useStore.getState()
    newScale = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE)

    // Zoom toward viewport center
    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    const newOffsetX = cx - (cx - viewport.offsetX) * (newScale / viewport.scale)
    const newOffsetY = cy - (cy - viewport.offsetY) * (newScale / viewport.scale)

    useStore.getState().setViewport({
      offsetX: newOffsetX,
      offsetY: newOffsetY,
      scale: newScale,
    })
  }

  const zoomIn = () => zoomTo(scale * ZOOM_FACTOR)
  const zoomOut = () => zoomTo(scale / ZOOM_FACTOR)
  const resetZoom = () => useStore.getState().setViewport({ offsetX: 0, offsetY: 0, scale: 1 })

  const fitToScreen = () => {
    const { objects } = useStore.getState()
    if (objects.length === 0) { resetZoom(); return }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const obj of objects) {
      const bb = obj.boundingBox
      const ox = obj.position.x
      const oy = obj.position.y
      minX = Math.min(minX, bb.x + ox)
      minY = Math.min(minY, bb.y + oy)
      maxX = Math.max(maxX, bb.x + bb.width + ox)
      maxY = Math.max(maxY, bb.y + bb.height + oy)
    }

    const padding = 60
    const contentW = maxX - minX
    const contentH = maxY - minY
    if (contentW === 0 || contentH === 0) { resetZoom(); return }

    const scaleX = (window.innerWidth - padding * 2) / contentW
    const scaleY = (window.innerHeight - padding * 2) / contentH
    const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), MIN_SCALE), MAX_SCALE)

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const newOffsetX = window.innerWidth / 2 - centerX * newScale
    const newOffsetY = window.innerHeight / 2 - centerY * newScale

    useStore.getState().setViewport({ offsetX: newOffsetX, offsetY: newOffsetY, scale: newScale })
  }

  return (
    <div className="zoom-controls">
      <button className="zoom-controls__button" onClick={fitToScreen} title="Fit to screen">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
        </svg>
      </button>
      <button className="zoom-controls__button" onClick={zoomOut} title="Zoom out">
        −
      </button>
      <button className="zoom-controls__label" onClick={resetZoom} title="Reset zoom">
        {Math.round(scale * 100)}%
      </button>
      <button className="zoom-controls__button" onClick={zoomIn} title="Zoom in">
        +
      </button>
    </div>
  )
}
