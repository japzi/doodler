import { useState, useCallback, useRef, useEffect } from 'react'
import './Toolbar.css'
import { useStore } from '../../store/useStore'
import { exportProject, importProject } from '../../store/useStore'
import { copySvgToClipboard, downloadSvg } from '../../export/svgExport'
import { exportPng } from '../../export/pngExport'
import { ColorPicker } from './ColorPicker'
import { FontPicker } from './FontPicker'
import { DEFAULT_FONT_FAMILY } from '../../fonts/fontRegistry'
import { supabase } from '../../lib/supabase'
import type { ImageObject } from '../../types/scene'
import { generateId } from '../../utils/idGenerator'

export function Toolbar() {
  const activeTool = useStore((s) => s.activeTool)
  const strokeColor = useStore((s) => s.strokeColor)
  const fillColor = useStore((s) => s.fillColor)
  const strokeWidth = useStore((s) => s.strokeWidth)
  const opacity = useStore((s) => s.opacity)
  const fontSize = useStore((s) => s.fontSize)
  const fontFamily = useStore((s) => s.fontFamily)
  const bold = useStore((s) => s.bold)
  const italic = useStore((s) => s.italic)
  const underline = useStore((s) => s.underline)
  const setActiveTool = useStore((s) => s.setActiveTool)
  const setStrokeColor = useStore((s) => s.setStrokeColor)
  const setFillColor = useStore((s) => s.setFillColor)
  const setStrokeWidth = useStore((s) => s.setStrokeWidth)
  const setOpacity = useStore((s) => s.setOpacity)
  const setFontSize = useStore((s) => s.setFontSize)
  const setFontFamily = useStore((s) => s.setFontFamily)
  const setBold = useStore((s) => s.setBold)
  const setItalic = useStore((s) => s.setItalic)
  const setUnderline = useStore((s) => s.setUnderline)
  const shadowEnabled = useStore((s) => s.shadowEnabled)
  const shadowOffset = useStore((s) => s.shadowOffset)
  const setShadowEnabled = useStore((s) => s.setShadowEnabled)
  const setShadowOffset = useStore((s) => s.setShadowOffset)
  const clearDrawing = useStore((s) => s.clearDrawing)
  const updateObjectStyles = useStore((s) => s.updateObjectStyles)
  const selectedIds = useStore((s) => s.selectedIds)
  const objects = useStore((s) => s.objects)
  const showGrid = useStore((s) => s.showGrid)
  const toggleGrid = useStore((s) => s.toggleGrid)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const canUndo = useStore((s) => s._history.length > 0)
  const canRedo = useStore((s) => s._future.length > 0)
  const [toast, setToast] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const hasSelection = selectedIds.size > 0
  const selectedObjects = hasSelection ? objects.filter((o) => selectedIds.has(o.id)) : []
  const selectedHasFill = selectedObjects.some((o) => o.type === 'rectangle' || o.type === 'ellipse')
  const selectedHasStrokeWidth = selectedObjects.some((o) => o.type !== 'text')
  const selectedHasText = selectedObjects.some((o) => o.type === 'text')
  // Sync toolbar to first selected object's styles
  useEffect(() => {
    if (!hasSelection) return
    const first = objects.find((o) => selectedIds.has(o.id))
    if (!first) return
    if (first.type === 'group') return
    setStrokeColor(first.color)
    setOpacity(first.opacity ?? 1)
    if ('strokeWidth' in first && first.strokeWidth !== undefined) setStrokeWidth(first.strokeWidth)
    if ('fillColor' in first && first.fillColor !== undefined) setFillColor(first.fillColor)
    if (first.type === 'rectangle' || first.type === 'ellipse') {
      setShadowEnabled(!!first.shadow)
      if (first.shadow) setShadowOffset(first.shadow.offset)
    }
    if (first.type === 'text') {
      setFontFamily(first.fontFamily ?? DEFAULT_FONT_FAMILY)
      setFontSize(first.fontSize)
      setBold(first.bold ?? false)
      setItalic(first.italic ?? false)
      setUnderline(first.underline ?? false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds])

  const handleNewDrawing = useCallback(() => {
    if (!window.confirm('Start a new drawing? Unsaved changes will be lost.')) return
    clearDrawing()
    setToast('New drawing created')
    setTimeout(() => setToast(null), 2000)
  }, [clearDrawing])

  const handleSave = useCallback(async () => {
    await exportProject()
  }, [])

  const handleLoad = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await importProject(file)
      setToast('Drawing loaded!')
      setTimeout(() => setToast(null), 2000)
    } catch (err) {
      console.error('Load failed:', err)
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

  const handleDownloadSvg = useCallback(async () => {
    const objects = useStore.getState().objects
    try {
      await downloadSvg(objects)
      setToast('SVG downloaded!')
    } catch {
      setToast('Failed to download SVG')
    }
    setTimeout(() => setToast(null), 2000)
  }, [])

  const handleExportPng = useCallback(async () => {
    const objects = useStore.getState().objects
    try {
      await exportPng(objects, 2, true)
      setToast('PNG exported!')
    } catch {
      setToast('Failed to export PNG')
    }
    setTimeout(() => setToast(null), 2000)
  }, [])

  const handleImportImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const img = new Image()
      img.onload = () => {
        const MAX_DIM = 400
        let w = img.naturalWidth
        let h = img.naturalHeight
        if (w > MAX_DIM || h > MAX_DIM) {
          const scale = MAX_DIM / Math.max(w, h)
          w = Math.round(w * scale)
          h = Math.round(h * scale)
        }
        const { viewport } = useStore.getState()
        const cx = (-viewport.offsetX + window.innerWidth / 2) / viewport.scale - w / 2
        const cy = (-viewport.offsetY + window.innerHeight / 2) / viewport.scale - h / 2
        const imageObj: ImageObject = {
          type: 'image',
          id: generateId(),
          src: dataUrl,
          width: w,
          height: h,
          color: '#000',
          position: { x: cx, y: cy },
          boundingBox: { x: 0, y: 0, width: w, height: h },
        }
        useStore.getState().addObject(imageObj)
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [])

  const isShapeTool = activeTool === 'rectangle' || activeTool === 'ellipse' || activeTool === 'line' || activeTool === 'arrow'

  return (
    <>
      <div className="toolbar">
        <button
          className="toolbar__button"
          onClick={undo}
          disabled={!canUndo}
          data-tooltip="Undo (⌘Z)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
          </svg>
        </button>
        <button
          className="toolbar__button"
          onClick={redo}
          disabled={!canRedo}
          data-tooltip="Redo (⌘⇧Z)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 11-2.13-9.36L23 10" />
          </svg>
        </button>

        <div className="toolbar__divider" />

        <button
          className={`toolbar__button ${activeTool === 'pointer' ? 'toolbar__button--active' : ''}`}
          onClick={() => setActiveTool('pointer')}
          data-tooltip="Pointer (V)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            <path d="M13 13l6 6" />
          </svg>
        </button>
        <button
          className={`toolbar__button ${activeTool === 'text' ? 'toolbar__button--active' : ''}`}
          onClick={() => setActiveTool('text')}
          data-tooltip="Text (T)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 4v3h5.5v12h3V7H19V4z" />
          </svg>
        </button>
        <button
          className={`toolbar__button ${activeTool === 'pen' ? 'toolbar__button--active' : ''}`}
          onClick={() => setActiveTool('pen')}
          data-tooltip="Pen (P)"
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
          data-tooltip="Rectangle (R)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
        </button>
        <button
          className={`toolbar__button ${activeTool === 'ellipse' ? 'toolbar__button--active' : ''}`}
          onClick={() => setActiveTool('ellipse')}
          data-tooltip="Ellipse (E)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <ellipse cx="12" cy="12" rx="10" ry="8" />
          </svg>
        </button>
        <button
          className={`toolbar__button ${activeTool === 'line' ? 'toolbar__button--active' : ''}`}
          onClick={() => setActiveTool('line')}
          data-tooltip="Line (L)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="5" y1="19" x2="19" y2="5" />
          </svg>
        </button>
        <button
          className={`toolbar__button ${activeTool === 'arrow' ? 'toolbar__button--active' : ''}`}
          onClick={() => setActiveTool('arrow')}
          data-tooltip="Arrow (A)"
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
            data-tooltip="Stroke width"
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
              data-tooltip="Fill opacity"
            />
            <span className="toolbar__opacity-label">{Math.round(opacity * 100)}%</span>
          </div>
        )}

        {(activeTool === 'rectangle' || activeTool === 'ellipse' || (activeTool === 'pointer' && selectedHasFill)) && (
          <>
            <button
              className={`toolbar__button ${shadowEnabled ? 'toolbar__button--active' : ''}`}
              onClick={() => {
                const next = !shadowEnabled
                setShadowEnabled(next)
                if (hasSelection) {
                  updateObjectStyles(selectedIds, { shadow: next ? { offset: shadowOffset } : null })
                }
              }}
              data-tooltip="Drop shadow"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="12" height="12" rx="1" />
                <path d="M9 21h12V9" strokeDasharray="3 2" />
              </svg>
            </button>
            {shadowEnabled && (
              <div className="toolbar__opacity-control">
                <input
                  className="toolbar__opacity-slider"
                  type="range"
                  min={2}
                  max={20}
                  value={shadowOffset}
                  onChange={(e) => {
                    const o = Number(e.target.value)
                    setShadowOffset(o)
                    if (hasSelection) {
                      updateObjectStyles(selectedIds, { shadow: { offset: o } })
                    }
                  }}
                  data-tooltip="Shadow offset"
                />
                <span className="toolbar__opacity-label">{shadowOffset}px</span>
              </div>
            )}
          </>
        )}

        {(activeTool === 'text' || (activeTool === 'pointer' && selectedHasText)) && (
          <>
            <div className="toolbar__divider" />
            <FontPicker
              value={fontFamily}
              onChange={(family) => {
                setFontFamily(family)
                if (hasSelection) updateObjectStyles(selectedIds, { fontFamily: family })
              }}
            />
            <select
              className="toolbar__font-size-select"
              value={fontSize}
              onChange={(e) => {
                const size = Number(e.target.value)
                setFontSize(size)
                if (hasSelection) updateObjectStyles(selectedIds, { fontSize: size })
              }}
              data-tooltip="Font size"
            >
              {[14, 18, 24, 32, 48, 64].map((size) => (
                <option key={size} value={size}>{size}px</option>
              ))}
            </select>
            <button
              className={`toolbar__button ${bold ? 'toolbar__button--active' : ''}`}
              onClick={() => {
                const next = !bold
                setBold(next)
                if (hasSelection) updateObjectStyles(selectedIds, { bold: next })
              }}
              data-tooltip="Bold"
            >
              <strong>B</strong>
            </button>
            <button
              className={`toolbar__button ${italic ? 'toolbar__button--active' : ''}`}
              onClick={() => {
                const next = !italic
                setItalic(next)
                if (hasSelection) updateObjectStyles(selectedIds, { italic: next })
              }}
              data-tooltip="Italic"
            >
              <em>I</em>
            </button>
            <button
              className={`toolbar__button ${underline ? 'toolbar__button--active' : ''}`}
              onClick={() => {
                const next = !underline
                setUnderline(next)
                if (hasSelection) updateObjectStyles(selectedIds, { underline: next })
              }}
              data-tooltip="Underline"
            >
              <u>U</u>
            </button>
          </>
        )}

        <div className="toolbar__divider" />

        <button
          className={`toolbar__button ${showGrid ? 'toolbar__button--active' : ''}`}
          onClick={toggleGrid}
          data-tooltip="Grid (G)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="4" cy="4" r="1.5" />
            <circle cx="12" cy="4" r="1.5" />
            <circle cx="20" cy="4" r="1.5" />
            <circle cx="4" cy="12" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="20" cy="12" r="1.5" />
            <circle cx="4" cy="20" r="1.5" />
            <circle cx="12" cy="20" r="1.5" />
            <circle cx="20" cy="20" r="1.5" />
          </svg>
        </button>
        <button
          className="toolbar__button"
          onClick={() => {
            setActiveTool('pointer')
            const allIds = new Set(useStore.getState().objects.map((o) => o.id))
            useStore.getState().setSelectedIds(allIds)
          }}
          disabled={objects.length === 0}
          data-tooltip="Select All (⌘A)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2" />
            <polyline points="8 12 11 15 16 9" />
          </svg>
        </button>

        <button
          className="toolbar__button"
          onClick={() => imageInputRef.current?.click()}
          data-tooltip="Import Image"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImportImage}
        />

        <div className="toolbar__divider" />

        <button
          className="toolbar__copy-button"
          onClick={handleCopySvg}
          data-tooltip="Copy SVG"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          Copy SVG
        </button>
        <button
          className="toolbar__copy-button"
          onClick={handleExportPng}
          data-tooltip="Export PNG"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          PNG
        </button>
        <button
          className="toolbar__copy-button"
          onClick={handleDownloadSvg}
          data-tooltip="Download SVG"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          SVG
        </button>

        <div className="toolbar__divider" />

        <button
          className="toolbar__copy-button"
          onClick={handleNewDrawing}
          data-tooltip="New drawing"
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
          data-tooltip="Save"
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
          data-tooltip="Load"
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
          accept=".json,.zip"
          style={{ display: 'none' }}
          onChange={handleLoad}
        />

        <div className="toolbar__divider" />

        <button
          className="toolbar__copy-button toolbar__sign-out"
          onClick={() => supabase.auth.signOut()}
          data-tooltip="Sign out"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
