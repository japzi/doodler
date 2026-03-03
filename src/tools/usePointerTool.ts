import { useCallback, useRef } from 'react'
import { useStore } from '../store/useStore'
import { getObjectIdFromEvent } from '../utils/hitTest'
import { boxesIntersect, getWorldBounds } from '../utils/boundingBox'
import type { Point, SceneObject, BoundingBox } from '../types/scene'

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se'

export function usePointerTool() {
  const isDragging = useRef(false)
  const lastPoint = useRef<Point | null>(null)
  const dragTarget = useRef<Set<string> | null>(null)

  // Marquee state
  const isMarquee = useRef(false)
  const marqueeStart = useRef<Point | null>(null)
  const shiftOnDown = useRef(false)

  // Resize state
  const isResizing = useRef(false)
  const resizeHandle = useRef<ResizeHandle | null>(null)
  const resizeAnchor = useRef<Point | null>(null)
  const resizeOriginalCorner = useRef<Point | null>(null)
  const resizeSnapshots = useRef<Map<string, SceneObject> | null>(null)

  const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>, scenePoint: Point) => {
    if (e.button !== 0) return

    shiftOnDown.current = e.shiftKey

    // Check for resize handle first
    const target = e.target as SVGElement
    const handleAttr = target.closest('[data-resize-handle]')?.getAttribute('data-resize-handle') as ResizeHandle | null
    if (handleAttr) {
      isResizing.current = true
      resizeHandle.current = handleAttr

      // Compute selection bounding box for anchor
      const { objects, selectedIds } = useStore.getState()
      const selected = objects.filter((o) => selectedIds.has(o.id))
      if (selected.length === 0) return

      const padding = 8
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const obj of selected) {
        const bb = obj.boundingBox
        minX = Math.min(minX, obj.position.x + bb.x)
        minY = Math.min(minY, obj.position.y + bb.y)
        maxX = Math.max(maxX, obj.position.x + bb.x + bb.width)
        maxY = Math.max(maxY, obj.position.y + bb.y + bb.height)
      }

      // Anchor is opposite corner, original corner is the handle corner
      const corners: Record<ResizeHandle, { anchor: Point; corner: Point }> = {
        nw: { anchor: { x: maxX + padding, y: maxY + padding }, corner: { x: minX - padding, y: minY - padding } },
        ne: { anchor: { x: minX - padding, y: maxY + padding }, corner: { x: maxX + padding, y: minY - padding } },
        sw: { anchor: { x: maxX + padding, y: minY - padding }, corner: { x: minX - padding, y: maxY + padding } },
        se: { anchor: { x: minX - padding, y: minY - padding }, corner: { x: maxX + padding, y: maxY + padding } },
      }

      resizeAnchor.current = corners[handleAttr].anchor
      resizeOriginalCorner.current = corners[handleAttr].corner
      resizeSnapshots.current = new Map(selected.map((o) => [o.id, structuredClone(o)]))
      ;(e.target as SVGElement).setPointerCapture(e.pointerId)
      return
    }

    const objectId = getObjectIdFromEvent(e)

    if (objectId) {
      const { selectedIds } = useStore.getState()
      if (e.shiftKey) {
        // Toggle object in/out of selection
        const newIds = new Set(selectedIds)
        if (newIds.has(objectId)) {
          newIds.delete(objectId)
        } else {
          newIds.add(objectId)
        }
        useStore.getState().setSelectedIds(newIds)
      } else if (!selectedIds.has(objectId)) {
        useStore.getState().setSelectedIds(new Set([objectId]))
      }
      isDragging.current = true
      lastPoint.current = scenePoint
      dragTarget.current = new Set(useStore.getState().selectedIds)
      ;(e.target as SVGElement).setPointerCapture(e.pointerId)
    } else {
      // Start marquee
      if (!e.shiftKey) {
        useStore.getState().setSelectedIds(new Set())
      }
      isMarquee.current = true
      marqueeStart.current = scenePoint
    }
  }, [])

  const onPointerMove = useCallback((_e: React.PointerEvent<SVGSVGElement>, scenePoint: Point) => {
    // Resize
    if (isResizing.current && resizeAnchor.current && resizeOriginalCorner.current && resizeSnapshots.current) {
      const anchor = resizeAnchor.current
      const origCorner = resizeOriginalCorner.current
      const origDx = origCorner.x - anchor.x
      const origDy = origCorner.y - anchor.y
      const curDx = scenePoint.x - anchor.x
      const curDy = scenePoint.y - anchor.y

      let sx = origDx !== 0 ? curDx / origDx : 1
      let sy = origDy !== 0 ? curDy / origDy : 1

      // Shift for uniform scale
      if (_e.shiftKey) {
        const uniformScale = Math.max(Math.abs(sx), Math.abs(sy))
        sx = sx < 0 ? -uniformScale : uniformScale
        sy = sy < 0 ? -uniformScale : uniformScale
      }

      useStore.getState().resizeObjects(resizeSnapshots.current, anchor, sx, sy)
      return
    }

    // Drag
    if (isDragging.current && lastPoint.current && dragTarget.current) {
      const dx = scenePoint.x - lastPoint.current.x
      const dy = scenePoint.y - lastPoint.current.y
      useStore.getState().moveObjects(dragTarget.current, dx, dy)
      lastPoint.current = scenePoint
      return
    }

    // Marquee
    if (isMarquee.current && marqueeStart.current) {
      const start = marqueeStart.current
      const rect: BoundingBox = {
        x: Math.min(start.x, scenePoint.x),
        y: Math.min(start.y, scenePoint.y),
        width: Math.abs(scenePoint.x - start.x),
        height: Math.abs(scenePoint.y - start.y),
      }
      useStore.getState().setMarqueeRect(rect)
    }
  }, [])

  const onPointerUp = useCallback(() => {
    // Resize cleanup
    if (isResizing.current) {
      isResizing.current = false
      resizeHandle.current = null
      resizeAnchor.current = null
      resizeOriginalCorner.current = null
      resizeSnapshots.current = null
      return
    }

    // Marquee selection
    if (isMarquee.current && marqueeStart.current) {
      const marqueeRect = useStore.getState().marqueeRect
      if (marqueeRect && (marqueeRect.width > 2 || marqueeRect.height > 2)) {
        const { objects, selectedIds } = useStore.getState()
        const hitIds: string[] = []
        for (const obj of objects) {
          const wb = getWorldBounds(obj)
          if (boxesIntersect(marqueeRect, wb)) {
            hitIds.push(obj.id)
          }
        }
        if (shiftOnDown.current) {
          const merged = new Set(selectedIds)
          for (const id of hitIds) merged.add(id)
          useStore.getState().setSelectedIds(merged)
        } else {
          useStore.getState().setSelectedIds(new Set(hitIds))
        }
      }
      useStore.getState().setMarqueeRect(null)
      isMarquee.current = false
      marqueeStart.current = null
      shiftOnDown.current = false
      return
    }

    isDragging.current = false
    lastPoint.current = null
    dragTarget.current = null
  }, [])

  return { onPointerDown, onPointerMove, onPointerUp }
}
