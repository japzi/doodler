import { useState, useCallback } from 'react'
import './Toolbar.css'
import { useStore } from '../../store/useStore'
import { copySvgToClipboard } from '../../export/svgExport'

export function Toolbar() {
  const activeTool = useStore((s) => s.activeTool)
  const strokeColor = useStore((s) => s.strokeColor)
  const setActiveTool = useStore((s) => s.setActiveTool)
  const setStrokeColor = useStore((s) => s.setStrokeColor)
  const [toast, setToast] = useState<string | null>(null)

  const handleCopySvg = useCallback(async () => {
    const objects = useStore.getState().objects
    const success = await copySvgToClipboard(objects)
    setToast(success ? 'SVG copied to clipboard!' : 'Failed to copy SVG')
    setTimeout(() => setToast(null), 2000)
  }, [])

  return (
    <>
      <div className="toolbar">
        <button
          className={`toolbar__button ${activeTool === 'pointer' ? 'toolbar__button--active' : ''}`}
          onClick={() => setActiveTool('pointer')}
          title="Pointer (V)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 2l12 16-4.5-1.5L8 22l-2-1 3.5-5.5L4 14z" />
          </svg>
        </button>
        <button
          className={`toolbar__button ${activeTool === 'pen' ? 'toolbar__button--active' : ''}`}
          onClick={() => setActiveTool('pen')}
          title="Pen (P)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
            <circle cx="11" cy="11" r="2" />
          </svg>
        </button>

        <div className="toolbar__divider" />

        <input
          type="color"
          className="toolbar__color-input"
          value={strokeColor}
          onChange={(e) => setStrokeColor(e.target.value)}
          title="Stroke color"
        />

        <div className="toolbar__divider" />

        <button
          className="toolbar__copy-button"
          onClick={handleCopySvg}
          title="Copy SVG to clipboard"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          Copy SVG
        </button>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
