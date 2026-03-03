import { useCallback, useEffect, useRef } from 'react'
import './Canvas.css'
import { useStore } from '../../store/useStore'
import { SceneRenderer } from './SceneRenderer'
import { ActiveStrokeRenderer } from './ActiveStrokeRenderer'
import { ActiveShapeRenderer } from './ActiveShapeRenderer'
import { SelectionOverlay } from './SelectionOverlay'
import { TextInputOverlay } from './TextInputOverlay'
import { SelectionActionBar } from './SelectionActionBar'
import { usePenTool } from '../../tools/usePenTool'
import { usePointerTool } from '../../tools/usePointerTool'
import { useShapeTool } from '../../tools/useShapeTool'
import { useTextTool } from '../../tools/useTextTool'
import { getObjectIdFromEvent } from '../../utils/hitTest'
import type { Point } from '../../types/scene'

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
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })

  const penTool = usePenTool()
  const pointerTool = usePointerTool()
  const shapeTool = useShapeTool()
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
    } else if (activeTool === 'text') {
      textTool.onPointerDown(e, scenePoint)
    } else if (shapeTools.has(activeTool)) {
      shapeTool.onPointerDown(e, scenePoint)
    } else {
      pointerTool.onPointerDown(e, scenePoint)
    }
  }, [activeTool, penTool, pointerTool, shapeTool, textTool])

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
    } else if (activeTool === 'text') {
      textTool.onPointerMove()
    } else if (shapeTools.has(activeTool)) {
      shapeTool.onPointerMove(e, scenePoint)
    } else {
      pointerTool.onPointerMove(e, scenePoint)
    }
  }, [activeTool, penTool, pointerTool, shapeTool, textTool])

  const handlePointerUp = useCallback((_e: React.PointerEvent<SVGSVGElement>) => {
    if (isPanning.current) {
      isPanning.current = false
      return
    }

    if (activeTool === 'pen') {
      penTool.onPointerUp()
    } else if (activeTool === 'text') {
      textTool.onPointerUp()
    } else if (shapeTools.has(activeTool)) {
      shapeTool.onPointerUp()
    } else {
      pointerTool.onPointerUp()
    }
  }, [activeTool, penTool, pointerTool, shapeTool, textTool])

  const handleDoubleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const objectId = getObjectIdFromEvent(e.nativeEvent)
    if (!objectId) return

    const obj = useStore.getState().objects.find((o) => o.id === objectId)
    if (obj?.type === 'text') {
      useStore.getState().setEditingTextId(objectId)
    }
  }, [])

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const { viewport } = useStore.getState()
    const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1
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
        switch (e.key) {
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
        case 't':
        case 'T':
          useStore.getState().setActiveTool('text')
          break
        case 'Escape':
          useStore.getState().setActiveTool('pointer')
          break
        case 'Delete':
        case 'Backspace': {
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
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  const cursorClass = activeTool === 'text'
    ? 'canvas--text'
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
      >
        <g transform={`translate(${viewport.offsetX}, ${viewport.offsetY}) scale(${viewport.scale})`}>
          <SceneRenderer />
          <ActiveStrokeRenderer />
          <ActiveShapeRenderer />
          <SelectionOverlay />
        </g>
      </svg>
      <TextInputOverlay />
      <SelectionActionBar />
    </>
  )
}
