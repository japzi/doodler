import { useCallback, useRef } from 'react'
import { useStore } from '../store/useStore'
import { generateStrokePathData } from '../rendering/sketchyPath'
import { computeBoundingBox } from '../utils/boundingBox'
import { generateId } from '../utils/idGenerator'
import type { Point } from '../types/scene'

export function usePenTool() {
  const isDrawing = useRef(false)

  const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>, scenePoint: Point) => {
    if (e.button !== 0) return
    isDrawing.current = true
    ;(e.target as SVGElement).setPointerCapture(e.pointerId)
    useStore.getState().setActiveStrokePoints([scenePoint])
  }, [])

  const onPointerMove = useCallback((_e: React.PointerEvent<SVGSVGElement>, scenePoint: Point) => {
    if (!isDrawing.current) return
    const current = useStore.getState().activeStrokePoints
    if (!current) return
    useStore.setState({ activeStrokePoints: [...current, scenePoint] })
  }, [])

  const onPointerUp = useCallback(() => {
    if (!isDrawing.current) return
    isDrawing.current = false

    const { activeStrokePoints, strokeColor, strokeWidth, opacity, strokeOpacity, addObject } = useStore.getState()
    if (!activeStrokePoints || activeStrokePoints.length < 2) {
      useStore.getState().setActiveStrokePoints(null)
      return
    }

    const pathData = generateStrokePathData(activeStrokePoints, strokeWidth * 3)
    const boundingBox = computeBoundingBox(activeStrokePoints)

    addObject({
      type: 'pen',
      id: generateId(),
      points: activeStrokePoints,
      pathData,
      color: strokeColor,
      strokeWidth,
      opacity,
      strokeOpacity,
      position: { x: 0, y: 0 },
      boundingBox,
    })

    useStore.getState().setActiveStrokePoints(null)
  }, [])

  return { onPointerDown, onPointerMove, onPointerUp }
}
