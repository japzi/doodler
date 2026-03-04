import { useState, useCallback, useRef, useEffect } from 'react'
import './Toolbar.css'
import { useStore } from '../../store/useStore'
import { exportProject, importProject } from '../../store/useStore'
import { copySvgToClipboard } from '../../export/svgExport'
import { ColorPicker } from './ColorPicker'

export function Toolbar() {
  const activeTool = useStore((s) => s.activeTool)
  const strokeColor = useStore((s) => s.strokeColor)
  const fillColor = useStore((s) => s.fillColor)
  const strokeWidth = useStore((s) => s.strokeWidth)
  const opacity = useStore((s) => s.opacity)
  const fontSize = useStore((s) => s.fontSize)
  const setActiveTool = useStore((s) => s.setActiveTool)
  const setStrokeColor = useStore((s) => s.setStrokeColor)
  const setFillColor = useStore((s) => s.setFillColor)
  const setStrokeWidth = useStore((s) => s.setStrokeWidth)
  const setOpacity = useStore((s) => s.setOpacity)
  const setFontSize = useStore((s) => s.setFontSize)
  const clearDrawing = useStore((s) => s.clearDrawing)
  const updateObjectStyles = useStore((s) => s.updateObjectStyles)
  const selectedIds = useStore((s) => s.selectedIds)
  const objects = useStore((s) => s.objects)
  const [toast, setToast] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasSelection = selectedIds.size > 0
  const selectedObjects = hasSelection ? objects.filter((o) => selectedIds.has(o.id)) : []
  const selectedHasFill = selectedObjects.some((o) => o.type === 'rectangle' || o.type === 'ellipse')
  const selectedHasStrokeWidth = selectedObjects.some((o) => o.type !== 'text')
  // Sync toolbar to first selected object's styles
  useEffect(() => {
    if (!hasSelection) return
    const first = objects.find((o) => selectedIds.has(o.id))
    if (!first) return
    setStrokeColor(first.color)
    setOpacity(first.opacity ?? 1)
    if ('strokeWidth' in first && first.strokeWidth !== undefined) setStrokeWidth(first.strokeWidth)
    if ('fillColor' in first && first.fillColor !== undefined) setFillColor(first.fillColor)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds])

  const handleNewDrawing = useCallback(() => {
    if (!window.confirm('Start a new drawing? Unsaved changes will be lost.')) return
    clearDrawing()
    setToast('New drawing created')
    setTimeout(() => setToast(null), 2000)
  }, [clearDrawing])

  const handleSave = useCallback(() => {
    exportProject()
  }, [])

  const handleLoad = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await importProject(file)
      setToast('Drawing loaded!')
      setTimeout(() => setToast(null), 2000)
    } catch {
      setToast('Failed to load file')
      setTimeout(() => setToast(null), 2000)
    }
    e.target.value = ''
  }, [])

  const handleCopySvg = useCallback(async () => {
    const objects = useStore.getState().objects
    const success = await copySvgToClipboard(objects)
    setToast(success ? 'SVG copied to clipboard!' : 'Failed to copy SVG')
    setTimeout(() => setToast(null), 2000)
  }, [])

  const isShapeTool = activeTool === 'rectangle' || activeTool === 'ellipse' || activeTool === 'line' || activeTool === 'arrow'

  return (
    <>
      <div className="toolbar">
        <button
          className={`toolbar__button ${activeTool === 'pointer' ? 'toolbar__button--active' : ''}`}
          onClick={() => setActiveTool('pointer')}
          title="Pointer (V)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            <path d="M13 13l6 6" />
          </svg>
        </button>
        <button
          className={`toolbar__button ${activeTool === 'text' ? 'toolbar__button--active' : ''}`}
          onClick={() => setActiveTool('text')}
          title="Text (T)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 4v3h5.5v12h3V7H19V4z" />
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

        <button
          className={`toolbar__button ${activeTool === 'rectangle' ? 'toolbar__button--active' : ''}`}
          onClick={() => setActiveTool('rectangle')}
          title="Rectangle (R)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
        </button>
        <button
          className={`toolbar__button ${activeTool === 'ellipse' ? 'toolbar__button--active' : ''}`}
          onClick={() => setActiveTool('ellipse')}
          title="Ellipse (E)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <ellipse cx="12" cy="12" rx="10" ry="8" />
          </svg>
        </button>
        <button
          className={`toolbar__button ${activeTool === 'line' ? 'toolbar__button--active' : ''}`}
          onClick={() => setActiveTool('line')}
          title="Line (L)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="5" y1="19" x2="19" y2="5" />
          </svg>
        </button>
        <button
          className={`toolbar__button ${activeTool === 'arrow' ? 'toolbar__button--active' : ''}`}
          onClick={() => setActiveTool('arrow')}
          title="Arrow (A)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="19" x2="19" y2="5" />
            <polyline points="10 5 19 5 19 14" />
          </svg>
        </button>

        <div className="toolbar__divider" />

        <ColorPicker value={strokeColor} onChange={(color) => {
          setStrokeColor(color)
          if (hasSelection) updateObjectStyles(selectedIds, { color })
        }} label="Stroke" />

        {(activeTool === 'rectangle' || activeTool === 'ellipse' || (activeTool === 'pointer' && selectedHasFill)) && (
          <ColorPicker value={fillColor} onChange={(color) => {
            setFillColor(color)
            if (hasSelection) updateObjectStyles(selectedIds, { fillColor: color })
          }} allowNone label="Fill" />
        )}

        {(activeTool === 'pen' || isShapeTool || (activeTool === 'pointer' && selectedHasStrokeWidth)) && (
          <select
            className="toolbar__stroke-width-select"
            value={strokeWidth}
            onChange={(e) => {
              const w = Number(e.target.value)
              setStrokeWidth(w)
              if (hasSelection) updateObjectStyles(selectedIds, { strokeWidth: w })
            }}
            title="Stroke width"
          >
            {[1, 2, 3, 4, 6, 8].map((w) => (
              <option key={w} value={w}>{w}px</option>
            ))}
          </select>
        )}

        {(activeTool === 'rectangle' || activeTool === 'ellipse' || (activeTool === 'pointer' && selectedHasFill)) && (
          <div className="toolbar__opacity-control">
            <input
              className="toolbar__opacity-slider"
              type="range"
              min={0}
              max={100}
              value={Math.round(opacity * 100)}
              onChange={(e) => {
                const o = Number(e.target.value) / 100
                setOpacity(o)
                if (hasSelection) updateObjectStyles(selectedIds, { opacity: o })
              }}
              title="Fill opacity"
            />
            <span className="toolbar__opacity-label">{Math.round(opacity * 100)}%</span>
          </div>
        )}

        {activeTool === 'text' && (
          <>
            <div className="toolbar__divider" />
            <select
              className="toolbar__font-size-select"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              title="Font size"
            >
              {[14, 18, 24, 32, 48, 64].map((size) => (
                <option key={size} value={size}>{size}px</option>
              ))}
            </select>
          </>
        )}

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

        <div className="toolbar__divider" />

        <button
          className="toolbar__copy-button"
          onClick={handleNewDrawing}
          title="New drawing"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          New
        </button>
        <button
          className="toolbar__copy-button"
          onClick={handleSave}
          title="Save drawing as JSON"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Save
        </button>
        <button
          className="toolbar__copy-button"
          onClick={() => fileInputRef.current?.click()}
          title="Load drawing from JSON"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Load
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleLoad}
        />
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
