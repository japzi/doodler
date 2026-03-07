import { useCallback, useEffect, useRef } from 'react'
import './Canvas.css'
import { useStore } from '../../store/useStore'
import { SceneRenderer } from './SceneRenderer'
import { ActiveStrokeRenderer } from './ActiveStrokeRenderer'
import { ActiveShapeRenderer } from './ActiveShapeRenderer'
import { SelectionOverlay } from './SelectionOverlay'
import { TextInputOverlay } from './TextInputOverlay'
import { SelectionActionBar } from './SelectionActionBar'
import { ActivePolygonRenderer } from './ActivePolygonRenderer'
import { usePenTool } from '../../tools/usePenTool'
import { usePointerTool } from '../../tools/usePointerTool'
import { useShapeTool } from '../../tools/useShapeTool'
import { usePolygonTool } from '../../tools/usePolygonTool'
import { useTextTool } from '../../tools/useTextTool'
import { getObjectIdFromEvent } from '../../utils/hitTest'
import type { Point } from '../../types/scene'
import { getGridSize } from '../../utils/grid'

const shapeTools = new Set<string>(['rectangle', 'ellipse', 'line', 'arrow'])

function screenToScene(clientX: number, clientY: number): Point {
  const { viewport } = useStore.getState()
  return {
    x: (clientX - viewport.offsetX) / viewport.scale,
    y: (clientY - viewport.offsetY) / viewport.scale,
  }
}

export function Canvas() {
  const svgRef = useRef<SVGSVGElement>(null)
  const activeTool = useStore((s) => s.activeTool)
  const viewport = useStore((s) => s.viewport)
  const showGrid = useStore((s) => s.showGrid)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })
  const penTool = usePenTool()
  const pointerTool = usePointerTool()
  const shapeTool = useShapeTool()
  const polygonTool = usePolygonTool()
  const textTool = useTextTool()

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    // Middle-click to pan
    if (e.button === 1) {
      isPanning.current = true
      const vp = useStore.getState().viewport
      panStart.current = { x: e.clientX, y: e.clientY, ox: vp.offsetX, oy: vp.offsetY }
      ;(e.target as SVGElement).setPointerCapture(e.pointerId)
      e.preventDefault()
      return
    }

    const scenePoint = screenToScene(e.clientX, e.clientY)
    if (activeTool === 'pen') {
      penTool.onPointerDown(e, scenePoint)
    } else if (activeTool === 'polygon') {
      polygonTool.onPointerDown(e, scenePoint)
    } else if (activeTool === 'text') {
      textTool.onPointerDown(e, scenePoint)
    } else if (shapeTools.has(activeTool)) {
      shapeTool.onPointerDown(e, scenePoint)
    } else {
      pointerTool.onPointerDown(e, scenePoint)
    }
  }, [activeTool, penTool, polygonTool, pointerTool, shapeTool, textTool])

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (isPanning.current) {
      const dx = e.clientX - panStart.current.x
      const dy = e.clientY - panStart.current.y
      useStore.getState().setViewport({
        ...useStore.getState().viewport,
        offsetX: panStart.current.ox + dx,
        offsetY: panStart.current.oy + dy,
      })
      return
    }

    const scenePoint = screenToScene(e.clientX, e.clientY)
    if (activeTool === 'pen') {
      penTool.onPointerMove(e, scenePoint)
    } else if (activeTool === 'polygon') {
      polygonTool.onPointerMove(e, scenePoint)
    } else if (activeTool === 'text') {
      textTool.onPointerMove()
    } else if (shapeTools.has(activeTool)) {
      shapeTool.onPointerMove(e, scenePoint)
    } else {
      pointerTool.onPointerMove(e, scenePoint)
    }
  }, [activeTool, penTool, polygonTool, pointerTool, shapeTool, textTool])

  const handlePointerUp = useCallback((_e: React.PointerEvent<SVGSVGElement>) => {
    if (isPanning.current) {
      isPanning.current = false
      return
    }

    if (activeTool === 'pen') {
      penTool.onPointerUp()
    } else if (activeTool === 'polygon') {
      // polygon tool handles state via clicks, no pointer-up action needed
    } else if (activeTool === 'text') {
      textTool.onPointerUp()
    } else if (shapeTools.has(activeTool)) {
      shapeTool.onPointerUp()
    } else {
      pointerTool.onPointerUp()
    }
  }, [activeTool, penTool, polygonTool, pointerTool, shapeTool, textTool])

  const handleDoubleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool === 'polygon') {
      polygonTool.onDoubleClick(e)
      return
    }

    const objectId = getObjectIdFromEvent(e.nativeEvent)
    if (!objectId) return

    const obj = useStore.getState().objects.find((o) => o.id === objectId)
    if (obj?.type === 'text' && !obj.locked) {
      useStore.getState().setEditingTextId(objectId)
    }
  }, [activeTool, polygonTool])

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const { viewport } = useStore.getState()
    const intensity = Math.min(Math.abs(e.deltaY) / 100, 1)
    const zoomFactor = e.deltaY < 0 ? 1 + 0.03 * intensity : 1 / (1 + 0.03 * intensity)
    const newScale = Math.min(Math.max(viewport.scale * zoomFactor, 0.1), 10)

    // Zoom toward cursor
    const newOffsetX = e.clientX - (e.clientX - viewport.offsetX) * (newScale / viewport.scale)
    const newOffsetY = e.clientY - (e.clientY - viewport.offsetY) * (newScale / viewport.scale)

    useStore.getState().setViewport({
      offsetX: newOffsetX,
      offsetY: newOffsetY,
      scale: newScale,
    })
  }, [])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    svg.addEventListener('wheel', handleWheel, { passive: false })
    return () => svg.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const hasModifier = e.metaKey || e.ctrlKey

      if (hasModifier) {
        if ((e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
          e.preventDefault()
          useStore.getState().undo()
          return
        }
        if ((e.key === 'z' || e.key === 'Z') && e.shiftKey) {
          e.preventDefault()
          useStore.getState().redo()
          return
        }
        if (e.key === 'a' || e.key === 'A') {
          e.preventDefault()
          useStore.getState().setActiveTool('pointer')
          const { objects } = useStore.getState()
          useStore.getState().setSelectedIds(new Set(objects.map((o) => o.id)))
          return
        }
        if ((e.key === 'g' || e.key === 'G') && e.shiftKey) {
          e.preventDefault()
          const { selectedIds, ungroupObjects } = useStore.getState()
          if (selectedIds.size > 0) {
            ungroupObjects(selectedIds)
          }
          return
        }
        if ((e.key === 'g' || e.key === 'G') && !e.shiftKey) {
          e.preventDefault()
          const { selectedIds, groupObjects } = useStore.getState()
          if (selectedIds.size >= 2) {
            groupObjects(selectedIds)
          }
          return
        }
        switch (e.key) {
          case 'c':
          case 'C': {
            e.preventDefault()
            const { selectedIds, copyObjects } = useStore.getState()
            if (selectedIds.size > 0) {
              copyObjects(selectedIds)
            }
            return
          }
          case 'x':
          case 'X': {
            e.preventDefault()
            const { selectedIds, cutObjects } = useStore.getState()
            if (selectedIds.size > 0) {
              cutObjects(selectedIds)
            }
            return
          }
          case 'v':
          case 'V': {
            e.preventDefault()
            const { _clipboard, pasteObjects } = useStore.getState()
            if (_clipboard.length > 0) {
              pasteObjects()
            }
            return
          }
          case 'd':
          case 'D': {
            e.preventDefault()
            const { selectedIds, duplicateObjects } = useStore.getState()
            if (selectedIds.size > 0) {
              duplicateObjects(selectedIds)
            }
            return
          }
          case ']': {
            e.preventDefault()
            const { selectedIds, bringForward } = useStore.getState()
            if (selectedIds.size > 0) {
              bringForward(selectedIds)
            }
            return
          }
          case '[': {
            e.preventDefault()
            const { selectedIds, sendBackward } = useStore.getState()
            if (selectedIds.size > 0) {
              sendBackward(selectedIds)
            }
            return
          }
        }
      }

      switch (e.key) {
        case 'v':
        case 'V':
          useStore.getState().setActiveTool('pointer')
          break
        case 'p':
        case 'P':
          useStore.getState().setActiveTool('pen')
          break
        case 'r':
        case 'R':
          useStore.getState().setActiveTool('rectangle')
          break
        case 'e':
        case 'E':
          useStore.getState().setActiveTool('ellipse')
          break
        case 'l':
        case 'L':
          useStore.getState().setActiveTool('line')
          break
        case 'a':
        case 'A':
          useStore.getState().setActiveTool('arrow')
          break
        case 's':
        case 'S':
          useStore.getState().setActiveTool('polygon')
          break
        case 't':
        case 'T':
          useStore.getState().setActiveTool('text')
          break
        case 'g':
        case 'G':
          useStore.getState().toggleGrid()
          break
        case 'Enter': {
          // Close polygon if in polygon drawing mode
          const { activeTool: at, activePolygonPoints } = useStore.getState()
          if (at === 'polygon' && activePolygonPoints && activePolygonPoints.length >= 3) {
            polygonTool.closePolygon()
          }
          break
        }
        case 'Escape': {
          // Cancel polygon drawing if active, otherwise switch to pointer
          const { activeTool: at, activePolygonPoints } = useStore.getState()
          if (at === 'polygon' && activePolygonPoints) {
            useStore.getState().setActivePolygonPoints(null)
          } else {
            useStore.getState().setActiveTool('pointer')
          }
          break
        }
        case 'Delete':
        case 'Backspace': {
          // Delete selected polygon vertex if applicable
          const { selectedPolygonVertex: spv, selectedIds: sIds, objects: objs } = useStore.getState()
          if (spv !== null && sIds.size === 1) {
            const objId = [...sIds][0]
            const obj = objs.find((o) => o.id === objId)
            if (obj?.type === 'polygon' && !obj.locked && obj.points.length > 3) {
              useStore.getState().saveSnapshot()
              const worldPoints = obj.points.map((p) => ({ x: obj.position.x + p.x, y: obj.position.y + p.y }))
              worldPoints.splice(spv, 1)
              useStore.getState().updatePolygonGeometry(objId, worldPoints)
              useStore.getState().setSelectedPolygonVertex(null)
              break
            }
          }
          const { selectedIds, deleteObjects } = useStore.getState()
          if (selectedIds.size > 0) {
            deleteObjects(selectedIds)
          }
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [polygonTool])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  const cursorClass = activeTool === 'text'
    ? 'canvas--text'
    : activeTool === 'polygon'
      ? 'canvas--shape'
      : shapeTools.has(activeTool)
        ? 'canvas--shape'
        : `canvas--${activeTool}`

  return (
    <>
      <svg
        ref={svgRef}
        className={`canvas ${cursorClass}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onDragStart={(e) => e.preventDefault()}
      >
        <g transform={`translate(${viewport.offsetX}, ${viewport.offsetY}) scale(${viewport.scale})`}>
          {showGrid && (() => {
            const GRID = getGridSize(viewport.scale)
            const dotR = 1.5 / viewport.scale
            const vx = -viewport.offsetX / viewport.scale
            const vy = -viewport.offsetY / viewport.scale
            const vw = window.innerWidth / viewport.scale
            const vh = window.innerHeight / viewport.scale
            const gx = Math.floor(vx / GRID) * GRID
            const gy = Math.floor(vy / GRID) * GRID
            const gw = Math.ceil(vw / GRID + 2) * GRID
            const gh = Math.ceil(vh / GRID + 2) * GRID
            return (
              <>
                <defs>
                  <pattern id="grid-dots" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
                    <circle cx={GRID / 2} cy={GRID / 2} r={dotR} fill="#bbb" />
                  </pattern>
                </defs>
                <rect x={gx} y={gy} width={gw} height={gh} fill="url(#grid-dots)" />
              </>
            )
          })()}
          <SceneRenderer />
          <ActiveStrokeRenderer />
          <ActiveShapeRenderer />
          <ActivePolygonRenderer cursorPos={polygonTool.cursorPos} />
          <SelectionOverlay />
        </g>
      </svg>
      <TextInputOverlay />
      <SelectionActionBar />
    </>
  )
}
