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

  return (
    <div className="zoom-controls">
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
