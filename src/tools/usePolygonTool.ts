import { useCallback, useRef } from 'react'
import { useStore } from '../store/useStore'
import { generateRoughPolygon } from '../rendering/roughPath'
import { boundingBoxFromPolygon } from '../utils/boundingBox'
import { generateId } from '../utils/idGenerator'
import type { Point, PolygonShape } from '../types/scene'

export function usePolygonTool() {
  const cursorPos = useRef<Point | null>(null)

  const onPointerDown = useCallback((_e: React.PointerEvent<SVGSVGElement>, scenePoint: Point) => {
    const current = useStore.getState().activePolygonPoints
    const newPoints = current ? [...current, scenePoint] : [scenePoint]
    useStore.getState().setActivePolygonPoints(newPoints)
  }, [])

  const onPointerMove = useCallback((_e: React.PointerEvent<SVGSVGElement>, scenePoint: Point) => {
    cursorPos.current = scenePoint
  }, [])

  const closePolygon = useCallback(() => {
    const state = useStore.getState()
    let points = state.activePolygonPoints
    if (!points || points.length < 3) return

    // Remove duplicate last point (from double-click)
    const last = points[points.length - 1]
    const secondLast = points[points.length - 2]
    if (last.x === secondLast.x && last.y === secondLast.y) {
      points = points.slice(0, -1)
    }
    if (points.length < 3) return

    // Compute bounding box, normalize
    const bbox = boundingBoxFromPolygon(points)
    const normalizedPoints = points.map((p) => ({ x: p.x - bbox.x, y: p.y - bbox.y }))
    const pathData = generateRoughPolygon(normalizedPoints)

    const polygon: PolygonShape = {
      type: 'polygon',
      id: generateId(),
      points: normalizedPoints,
      color: state.strokeColor,
      fillColor: state.fillColor !== 'transparent' ? state.fillColor : undefined,
      strokeWidth: state.strokeWidth,
      opacity: state.opacity !== 1 ? state.opacity : undefined,
      shadow: state.shadowEnabled ? { offset: state.shadowOffset } : undefined,
      pathData,
      position: { x: bbox.x, y: bbox.y },
      boundingBox: { x: 0, y: 0, width: bbox.width, height: bbox.height },
    }

    state.addObject(polygon)
    state.setActivePolygonPoints(null)
  }, [])

  const onDoubleClick = useCallback((_e: React.MouseEvent<SVGSVGElement>) => {
    closePolygon()
  }, [closePolygon])

  return { onPointerDown, onPointerMove, onDoubleClick, closePolygon, cursorPos }
}
