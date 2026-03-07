import { useCallback, useRef } from 'react'
import { useStore } from '../store/useStore'
import { generateId } from '../utils/idGenerator'
import { boundingBoxFromRect, boundingBoxFromLine } from '../utils/boundingBox'
import { generateRoughRect, generateRoughEllipse, generateRoughCloud, generateRoughLine, generateRoughArrow } from '../rendering/roughPath'
import type { Point, ShapeToolType } from '../types/scene'
import { snapToGrid } from '../utils/grid'

export function useShapeTool() {
  const isDrawing = useRef(false)
  const startPoint = useRef<Point>({ x: 0, y: 0 })

  const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>, scenePoint: Point) => {
    if (e.button !== 0) return
    isDrawing.current = true
    const sp = snapToGrid(scenePoint)
    startPoint.current = sp
    ;(e.target as SVGElement).setPointerCapture(e.pointerId)

    const tool = useStore.getState().activeTool as ShapeToolType
    useStore.getState().setActiveShapePreview({
      type: tool,
      x: sp.x,
      y: sp.y,
      width: 0,
      height: 0,
      x1: sp.x,
      y1: sp.y,
      x2: sp.x,
      y2: sp.y,
    })
  }, [])

  const onPointerMove = useCallback((_e: React.PointerEvent<SVGSVGElement>, scenePoint: Point) => {
    if (!isDrawing.current) return
    const tool = useStore.getState().activeTool as ShapeToolType
    const sp = startPoint.current
    const ep = snapToGrid(scenePoint)

    if (tool === 'rectangle' || tool === 'ellipse' || tool === 'cloud') {
      const x = Math.min(sp.x, ep.x)
      const y = Math.min(sp.y, ep.y)
      const width = Math.abs(ep.x - sp.x)
      const height = Math.abs(ep.y - sp.y)

      useStore.getState().setActiveShapePreview({
        type: tool,
        x, y, width, height,
        x1: sp.x, y1: sp.y, x2: ep.x, y2: ep.y,
      })
    } else {
      useStore.getState().setActiveShapePreview({
        type: tool,
        x: Math.min(sp.x, ep.x),
        y: Math.min(sp.y, ep.y),
        width: Math.abs(ep.x - sp.x),
        height: Math.abs(ep.y - sp.y),
        x1: sp.x, y1: sp.y, x2: ep.x, y2: ep.y,
      })
    }
  }, [])

  const onPointerUp = useCallback(() => {
    if (!isDrawing.current) return
    isDrawing.current = false

    const { activeShapePreview, strokeColor, fillColor, strokeWidth, opacity, shadowEnabled, shadowOffset, addObject, setActiveShapePreview } = useStore.getState()
    if (!activeShapePreview) return

    const { type, x, y, width, height, x1, y1, x2, y2 } = activeShapePreview

    // Don't create zero-size shapes
    if (width < 2 && height < 2) {
      setActiveShapePreview(null)
      return
    }

    const id = generateId()
    const color = strokeColor

    switch (type) {
      case 'rectangle': {
        const pathData = generateRoughRect(x, y, width, height)
        addObject({
          type: 'rectangle',
          id, x, y, width, height, color, fillColor, strokeWidth, opacity, pathData,
          ...(shadowEnabled ? { shadow: { offset: shadowOffset } } : {}),
          position: { x: 0, y: 0 },
          boundingBox: boundingBoxFromRect(x, y, width, height),
        })
        break
      }
      case 'ellipse': {
        const cx = x + width / 2
        const cy = y + height / 2
        const pathData = generateRoughEllipse(cx, cy, width, height)
        addObject({
          type: 'ellipse',
          id, x, y, width, height, color, fillColor, strokeWidth, opacity, pathData,
          ...(shadowEnabled ? { shadow: { offset: shadowOffset } } : {}),
          position: { x: 0, y: 0 },
          boundingBox: boundingBoxFromRect(x, y, width, height),
        })
        break
      }
      case 'cloud': {
        const pathData = generateRoughCloud(x, y, width, height)
        addObject({
          type: 'cloud',
          id, x, y, width, height, color, fillColor, strokeWidth, opacity, pathData,
          ...(shadowEnabled ? { shadow: { offset: shadowOffset } } : {}),
          position: { x: 0, y: 0 },
          boundingBox: boundingBoxFromRect(x, y, width, height),
        })
        break
      }
      case 'line': {
        const pathData = generateRoughLine(x1, y1, x2, y2)
        addObject({
          type: 'line',
          id, x1, y1, x2, y2, color, strokeWidth, opacity, pathData,
          position: { x: 0, y: 0 },
          boundingBox: boundingBoxFromLine(x1, y1, x2, y2),
        })
        break
      }
      case 'arrow': {
        const arrowHeadSize = useStore.getState().arrowHeadSize
        const pathData = generateRoughArrow(x1, y1, x2, y2, arrowHeadSize)
        addObject({
          type: 'arrow',
          id, x1, y1, x2, y2, arrowHeadSize, color, strokeWidth, opacity, pathData,
          position: { x: 0, y: 0 },
          boundingBox: boundingBoxFromLine(x1, y1, x2, y2),
        })
        break
      }
    }

    setActiveShapePreview(null)
  }, [])

  return { onPointerDown, onPointerMove, onPointerUp }
}
