import { useCallback, useRef } from 'react'
import { useStore } from '../store/useStore'
import { getObjectIdFromEvent } from '../utils/hitTest'
import type { Point } from '../types/scene'

export function usePointerTool() {
  const isDragging = useRef(false)
  const lastPoint = useRef<Point | null>(null)
  const dragTarget = useRef<Set<string> | null>(null)

  const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>, scenePoint: Point) => {
    if (e.button !== 0) return

    const objectId = getObjectIdFromEvent(e)

    if (objectId) {
      const { selectedIds } = useStore.getState()
      if (!selectedIds.has(objectId)) {
        useStore.getState().setSelectedIds(new Set([objectId]))
      }
      isDragging.current = true
      lastPoint.current = scenePoint
      dragTarget.current = new Set(useStore.getState().selectedIds)
      ;(e.target as SVGElement).setPointerCapture(e.pointerId)
    } else {
      useStore.getState().setSelectedIds(new Set())
    }
  }, [])

  const onPointerMove = useCallback((_e: React.PointerEvent<SVGSVGElement>, scenePoint: Point) => {
    if (!isDragging.current || !lastPoint.current || !dragTarget.current) return

    const dx = scenePoint.x - lastPoint.current.x
    const dy = scenePoint.y - lastPoint.current.y

    useStore.getState().moveObjects(dragTarget.current, dx, dy)
    lastPoint.current = scenePoint
  }, [])

  const onPointerUp = useCallback(() => {
    isDragging.current = false
    lastPoint.current = null
    dragTarget.current = null
  }, [])

  return { onPointerDown, onPointerMove, onPointerUp }
}
