import { useCallback, useRef } from 'react'
import { useStore } from '../store/useStore'
import { getObjectIdFromEvent } from '../utils/hitTest'
import { boxesIntersect, getWorldBounds } from '../utils/boundingBox'
import type { Point, SceneObject, ArrowShape, LineShape, PolygonShape, BoundingBox } from '../types/scene'
import { snapToGrid } from '../utils/grid'
import { snapAngle, rotatePoint, getRotatedBounds } from '../utils/rotation'

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se'
type LineArrowHandleType = 'p1' | 'p2' | 'cp1' | 'cp2' | 'midpoint' | 'headSize'

/** Compute position correction when a rotated object's bbox center shifts.
 *  T = (I - R) * D  keeps all visual positions correct. */
function rotationCenterCorrection(rotation: number, oldCx: number, oldCy: number, newCx: number, newCy: number): Point {
  const dx = oldCx - newCx, dy = oldCy - newCy
  const rad = rotation * Math.PI / 180
  const cos = Math.cos(rad), sin = Math.sin(rad)
  return { x: (1 - cos) * dx + sin * dy, y: -sin * dx + (1 - cos) * dy }
}

export function usePointerTool() {
  const isDragging = useRef(false)
  const lastPoint = useRef<Point | null>(null)
  const dragStartCursor = useRef<Point | null>(null)
  const dragRefPoint = useRef<Point | null>(null)
  const dragAppliedDelta = useRef<Point>({ x: 0, y: 0 })
  const dragTarget = useRef<Set<string> | null>(null)

  // Pan state (left-click drag on empty space)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })

  // Marquee state (shift+drag on empty space)
  const isMarquee = useRef(false)
  const marqueeStart = useRef<Point | null>(null)
  const shiftOnDown = useRef(false)

  // Resize state
  const isResizing = useRef(false)
  const resizeHandle = useRef<ResizeHandle | null>(null)
  const resizeAnchor = useRef<Point | null>(null)
  const resizeOriginalCorner = useRef<Point | null>(null)
  const resizeSnapshots = useRef<Map<string, SceneObject> | null>(null)

  // Polygon handle drag state
  const polygonHandleDrag = useRef<{
    objId: string
    vertexIndex: number
    snapshot: PolygonShape
    startPoint: Point
  } | null>(null)

  // Line/Arrow handle drag state
  const lineArrowHandleDrag = useRef<{
    objId: string
    objType: 'arrow' | 'line'
    handleType: LineArrowHandleType
    snapshot: ArrowShape | LineShape
    startPoint: Point
  } | null>(null)

  // Rotation state
  const isRotating = useRef(false)
  const rotateStartAngle = useRef(0)
  const rotateCenter = useRef<Point>({ x: 0, y: 0 })
  const rotateSnapshots = useRef<Map<string, number>>(new Map())
  const rotateTargetIds = useRef<Set<string>>(new Set())

  const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>, scenePoint: Point) => {
    if (e.button !== 0) return

    shiftOnDown.current = e.shiftKey

    const target = e.target as SVGElement

    // Check for polygon handle
    const polygonHandleAttr = target.closest('[data-polygon-handle]')?.getAttribute('data-polygon-handle')
    if (polygonHandleAttr) {
      const { objects, selectedIds } = useStore.getState()
      const objId = [...selectedIds][0]
      const obj = objects.find((o) => o.id === objId && o.type === 'polygon') as PolygonShape | undefined
      if (!obj || obj.locked) return

      if (polygonHandleAttr === 'delete-vertex') {
        const vertexIndex = useStore.getState().selectedPolygonVertex
        if (vertexIndex !== null && obj.points.length > 3) {
          useStore.getState().saveSnapshot()
          const worldPoints = obj.points.map((p) => ({ x: obj.position.x + p.x, y: obj.position.y + p.y }))
          worldPoints.splice(vertexIndex, 1)
          useStore.getState().updatePolygonGeometry(objId, worldPoints)
          useStore.getState().setSelectedPolygonVertex(null)
        }
        return
      }

      if (polygonHandleAttr.startsWith('mid-')) {
        const midIndex = parseInt(polygonHandleAttr.slice(4), 10)
        useStore.getState().saveSnapshot()
        const worldPoints = obj.points.map((p) => ({ x: obj.position.x + p.x, y: obj.position.y + p.y }))
        const nextIndex = (midIndex + 1) % worldPoints.length
        const midpoint = {
          x: (worldPoints[midIndex].x + worldPoints[nextIndex].x) / 2,
          y: (worldPoints[midIndex].y + worldPoints[nextIndex].y) / 2,
        }
        worldPoints.splice(nextIndex, 0, midpoint)
        useStore.getState().updatePolygonGeometry(objId, worldPoints)
        return
      }

      if (polygonHandleAttr.startsWith('vertex-')) {
        const vertexIndex = parseInt(polygonHandleAttr.slice(7), 10)
        // Start vertex drag
        useStore.getState().saveSnapshot()
        useStore.getState().setSelectedPolygonVertex(vertexIndex)
        polygonHandleDrag.current = {
          objId,
          vertexIndex,
          snapshot: structuredClone(obj) as PolygonShape,
          startPoint: scenePoint,
        }
        ;(e.target as SVGElement).setPointerCapture(e.pointerId)
        return
      }

      return
    }

    // Check for rotation handle
    const rotateHandleAttr = target.closest('[data-rotate-handle]')?.getAttribute('data-rotate-handle')
    if (rotateHandleAttr) {
      const { objects, selectedIds } = useStore.getState()
      const selected = objects.filter((o) => selectedIds.has(o.id))
      if (selected.length === 0) return
      if (selected.some((o) => o.locked)) return

      useStore.getState().saveSnapshot()

      // Compute center of selection bounding box
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const obj of selected) {
        const bb = obj.boundingBox
        minX = Math.min(minX, obj.position.x + bb.x)
        minY = Math.min(minY, obj.position.y + bb.y)
        maxX = Math.max(maxX, obj.position.x + bb.x + bb.width)
        maxY = Math.max(maxY, obj.position.y + bb.y + bb.height)
      }
      const cx = (minX + maxX) / 2
      const cy = (minY + maxY) / 2
      rotateCenter.current = { x: cx, y: cy }

      // Compute initial angle from center to cursor
      rotateStartAngle.current = Math.atan2(scenePoint.y - cy, scenePoint.x - cx) * 180 / Math.PI

      // Store each object's current rotation
      const snapshots = new Map<string, number>()
      const ids = new Set<string>()
      for (const obj of selected) {
        snapshots.set(obj.id, obj.rotation ?? 0)
        ids.add(obj.id)
      }
      rotateSnapshots.current = snapshots
      rotateTargetIds.current = ids
      isRotating.current = true
      ;(e.target as SVGElement).setPointerCapture(e.pointerId)
      return
    }

    // Check for arrow handle
    const arrowHandleAttr = target.closest('[data-arrow-handle]')?.getAttribute('data-arrow-handle') as LineArrowHandleType | null
    // Check for line handle
    const lineHandleAttr = target.closest('[data-line-handle]')?.getAttribute('data-line-handle') as LineArrowHandleType | null

    const handleAttrValue = arrowHandleAttr || lineHandleAttr
    const handleObjType: 'arrow' | 'line' = arrowHandleAttr ? 'arrow' : 'line'

    if (handleAttrValue) {
      const { objects, selectedIds } = useStore.getState()
      const objId = [...selectedIds][0]
      const obj = objects.find((o) => o.id === objId && o.type === handleObjType) as (ArrowShape | LineShape) | undefined
      if (!obj || obj.locked) return

      if (handleAttrValue === 'midpoint') {
        // Break straight line/arrow into curve — place both control points at midpoint
        useStore.getState().saveSnapshot()
        const mx = (obj.x1 + obj.x2) / 2
        const my = (obj.y1 + obj.y2) / 2
        const updateFn = handleObjType === 'arrow'
          ? useStore.getState().updateArrowGeometry
          : useStore.getState().updateLineGeometry
        updateFn(objId, { cp1: { x: mx, y: my }, cp2: { x: mx, y: my } })
        return
      }

      // Start handle drag — snapshot once before continuous updates
      useStore.getState().saveSnapshot()
      lineArrowHandleDrag.current = {
        objId,
        objType: handleObjType,
        handleType: handleAttrValue,
        snapshot: structuredClone(obj) as ArrowShape | LineShape,
        startPoint: scenePoint,
      }
      ;(e.target as SVGElement).setPointerCapture(e.pointerId)
      return
    }

    // Check for resize handle
    const resizeAttr = target.closest('[data-resize-handle]')?.getAttribute('data-resize-handle') as ResizeHandle | null
    if (resizeAttr) {
      const { objects, selectedIds } = useStore.getState()
      const selected = objects.filter((o) => selectedIds.has(o.id))
      if (selected.length === 0) return
      if (selected.some((o) => o.locked)) return

      useStore.getState().saveSnapshot()
      isResizing.current = true
      resizeHandle.current = resizeAttr

      const pad = 8
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
        nw: { anchor: { x: maxX + pad, y: maxY + pad }, corner: { x: minX - pad, y: minY - pad } },
        ne: { anchor: { x: minX - pad, y: maxY + pad }, corner: { x: maxX + pad, y: minY - pad } },
        sw: { anchor: { x: maxX + pad, y: minY - pad }, corner: { x: minX - pad, y: maxY + pad } },
        se: { anchor: { x: minX - pad, y: minY - pad }, corner: { x: maxX + pad, y: maxY + pad } },
      }

      resizeAnchor.current = corners[resizeAttr].anchor
      resizeOriginalCorner.current = corners[resizeAttr].corner
      resizeSnapshots.current = new Map(selected.map((o) => [o.id, structuredClone(o)]))
      ;(e.target as SVGElement).setPointerCapture(e.pointerId)
      return
    }

    const objectId = getObjectIdFromEvent(e)

    if (objectId) {
      const { selectedIds, objects } = useStore.getState()
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
      // Check if clicked object is locked — still select but don't drag
      const clickedObj = objects.find((o) => o.id === objectId)
      if (clickedObj?.locked) return
      useStore.getState().saveSnapshot()
      isDragging.current = true
      lastPoint.current = scenePoint
      dragStartCursor.current = scenePoint
      dragAppliedDelta.current = { x: 0, y: 0 }
      dragTarget.current = new Set(useStore.getState().selectedIds)
      // Record first selected object's world bbox origin as snap reference
      const selIds = useStore.getState().selectedIds
      const firstSel = useStore.getState().objects.find((o) => selIds.has(o.id))
      dragRefPoint.current = firstSel ? { x: getWorldBounds(firstSel).x, y: getWorldBounds(firstSel).y } : scenePoint
      ;(e.target as SVGElement).setPointerCapture(e.pointerId)
    } else if (e.shiftKey) {
      // Shift+drag on empty space: marquee selection
      isMarquee.current = true
      marqueeStart.current = scenePoint
    } else {
      // Drag on empty space: pan
      useStore.getState().setSelectedIds(new Set())
      isPanning.current = true
      const vp = useStore.getState().viewport
      panStart.current = { x: e.clientX, y: e.clientY, ox: vp.offsetX, oy: vp.offsetY }
      ;(e.target as SVGElement).setPointerCapture(e.pointerId)
    }
  }, [])

  const onPointerMove = useCallback((_e: React.PointerEvent<SVGSVGElement>, scenePoint: Point) => {
    // Pan
    if (isPanning.current) {
      const dx = _e.clientX - panStart.current.x
      const dy = _e.clientY - panStart.current.y
      useStore.getState().setViewport({
        ...useStore.getState().viewport,
        offsetX: panStart.current.ox + dx,
        offsetY: panStart.current.oy + dy,
      })
      return
    }

    // Rotation
    if (isRotating.current) {
      const cx = rotateCenter.current.x
      const cy = rotateCenter.current.y
      const currentAngle = Math.atan2(scenePoint.y - cy, scenePoint.x - cx) * 180 / Math.PI
      const delta = currentAngle - rotateStartAngle.current

      const angleMap = new Map<string, number>()
      for (const [id, origRotation] of rotateSnapshots.current) {
        const newRotation = origRotation + delta
        angleMap.set(id, snapAngle(newRotation))
      }
      useStore.getState().rotateObjects(angleMap)
      return
    }

    // Polygon handle drag
    if (polygonHandleDrag.current) {
      const { objId, vertexIndex, snapshot, startPoint } = polygonHandleDrag.current
      let dx = scenePoint.x - startPoint.x
      let dy = scenePoint.y - startPoint.y

      // Un-rotate delta for rotated polygons
      const polyRot = snapshot.rotation ?? 0
      if (polyRot !== 0) {
        const rad = -polyRot * Math.PI / 180
        const cos = Math.cos(rad), sin = Math.sin(rad)
        const rdx = dx * cos - dy * sin
        const rdy = dx * sin + dy * cos
        dx = rdx; dy = rdy
      }

      const worldPoints = snapshot.points.map((p, i) => {
        const wx = snapshot.position.x + p.x + (i === vertexIndex ? dx : 0)
        const wy = snapshot.position.y + p.y + (i === vertexIndex ? dy : 0)
        return { x: wx, y: wy }
      })
      useStore.getState().updatePolygonGeometry(objId, worldPoints)

      // Fix visual drift: bbox center (rotation pivot) shifted, correct position
      if (polyRot !== 0) {
        const updated = useStore.getState().objects.find((o) => o.id === objId)
        if (updated) {
          const oldBB = snapshot.boundingBox
          const oldCx = snapshot.position.x + oldBB.x + oldBB.width / 2
          const oldCy = snapshot.position.y + oldBB.y + oldBB.height / 2
          const newBB = updated.boundingBox
          const newCx = updated.position.x + newBB.x + newBB.width / 2
          const newCy = updated.position.y + newBB.y + newBB.height / 2
          const t = rotationCenterCorrection(polyRot, oldCx, oldCy, newCx, newCy)
          if (Math.abs(t.x) > 0.001 || Math.abs(t.y) > 0.001) {
            useStore.getState().moveObjects(new Set([objId]), t.x, t.y)
          }
        }
      }
      return
    }

    // Line/Arrow handle drag
    if (lineArrowHandleDrag.current) {
      const { objId, objType, handleType, snapshot, startPoint } = lineArrowHandleDrag.current

      // Arrow head size drag
      if (handleType === 'headSize' && objType === 'arrow') {
        let tipX = snapshot.position.x + snapshot.x2
        let tipY = snapshot.position.y + snapshot.y2
        const rotation = snapshot.rotation ?? 0
        if (rotation !== 0) {
          const bb = snapshot.boundingBox
          const cx = snapshot.position.x + bb.x + bb.width / 2
          const cy = snapshot.position.y + bb.y + bb.height / 2
          const rotated = rotatePoint(tipX, tipY, cx, cy, rotation)
          tipX = rotated.x
          tipY = rotated.y
        }
        const dist = Math.sqrt((scenePoint.x - tipX) ** 2 + (scenePoint.y - tipY) ** 2)
        const newSize = Math.max(4, Math.min(64, Math.round(dist)))
        useStore.getState().updateArrowHeadSize(new Set([objId]), newSize)
        return
      }

      let dx = scenePoint.x - startPoint.x
      let dy = scenePoint.y - startPoint.y

      // Un-rotate delta for rotated lines/arrows
      const laRot = snapshot.rotation ?? 0
      if (laRot !== 0) {
        const rad = -laRot * Math.PI / 180
        const cos = Math.cos(rad), sin = Math.sin(rad)
        const rdx = dx * cos - dy * sin
        const rdy = dx * sin + dy * cos
        dx = rdx; dy = rdy
      }

      // Always pass all coordinates from snapshot for consistency
      const updates: Partial<{ x1: number; y1: number; x2: number; y2: number; cp1: { x: number; y: number }; cp2: { x: number; y: number } }> = {
        x1: snapshot.x1,
        y1: snapshot.y1,
        x2: snapshot.x2,
        y2: snapshot.y2,
        ...(snapshot.cp1 && snapshot.cp2 ? {
          cp1: { x: snapshot.cp1.x, y: snapshot.cp1.y },
          cp2: { x: snapshot.cp2.x, y: snapshot.cp2.y },
        } : {}),
      }

      switch (handleType) {
        case 'p1':
          updates.x1 = snapshot.x1 + dx
          updates.y1 = snapshot.y1 + dy
          break
        case 'p2':
          updates.x2 = snapshot.x2 + dx
          updates.y2 = snapshot.y2 + dy
          break
        case 'cp1':
          if (snapshot.cp1) {
            updates.cp1 = { x: snapshot.cp1.x + dx, y: snapshot.cp1.y + dy }
          }
          break
        case 'cp2':
          if (snapshot.cp2) {
            updates.cp2 = { x: snapshot.cp2.x + dx, y: snapshot.cp2.y + dy }
          }
          break
      }

      const updateFn = objType === 'arrow'
        ? useStore.getState().updateArrowGeometry
        : useStore.getState().updateLineGeometry
      updateFn(objId, updates)

      // Fix visual drift: bbox center (rotation pivot) shifted, correct position
      if (laRot !== 0) {
        const updated = useStore.getState().objects.find((o) => o.id === objId)
        if (updated) {
          const oldBB = snapshot.boundingBox
          const oldCo = { x: oldBB.x + oldBB.width / 2, y: oldBB.y + oldBB.height / 2 }
          const newBB = updated.boundingBox
          const newCo = { x: newBB.x + newBB.width / 2, y: newBB.y + newBB.height / 2 }
          // T relative to snapshot.position; set position absolutely to avoid drift accumulation
          const t = rotationCenterCorrection(laRot, oldCo.x, oldCo.y, newCo.x, newCo.y)
          const targetX = snapshot.position.x + t.x
          const targetY = snapshot.position.y + t.y
          const moveX = targetX - updated.position.x
          const moveY = targetY - updated.position.y
          if (Math.abs(moveX) > 0.001 || Math.abs(moveY) > 0.001) {
            useStore.getState().moveObjects(new Set([objId]), moveX, moveY)
          }
        }
      }
      return
    }

    // Resize
    if (isResizing.current && resizeAnchor.current && resizeOriginalCorner.current && resizeSnapshots.current) {
      const anchor = resizeAnchor.current
      const origCorner = resizeOriginalCorner.current

      // For single rotated objects, un-rotate cursor around object center
      let adjustedScene = scenePoint
      if (resizeSnapshots.current.size === 1) {
        const snap = [...resizeSnapshots.current.values()][0]
        const rotation = snap.rotation ?? 0
        if (rotation !== 0) {
          const bb = snap.boundingBox
          const ocx = snap.position.x + bb.x + bb.width / 2
          const ocy = snap.position.y + bb.y + bb.height / 2
          adjustedScene = rotatePoint(scenePoint.x, scenePoint.y, ocx, ocy, -rotation)
        }
      }

      const origDx = origCorner.x - anchor.x
      const origDy = origCorner.y - anchor.y
      const curDx = adjustedScene.x - anchor.x
      const curDy = adjustedScene.y - anchor.y

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
    if (isDragging.current && dragStartCursor.current && dragRefPoint.current && dragTarget.current) {
      const rawDx = scenePoint.x - dragStartCursor.current.x
      const rawDy = scenePoint.y - dragStartCursor.current.y
      // Snap the object's reference point (bbox origin), not the cursor
      const snapped = snapToGrid({ x: dragRefPoint.current.x + rawDx, y: dragRefPoint.current.y + rawDy })
      const snappedDx = snapped.x - dragRefPoint.current.x
      const snappedDy = snapped.y - dragRefPoint.current.y
      const moveDx = snappedDx - dragAppliedDelta.current.x
      const moveDy = snappedDy - dragAppliedDelta.current.y
      if (moveDx !== 0 || moveDy !== 0) {
        useStore.getState().moveObjects(dragTarget.current, moveDx, moveDy)
        dragAppliedDelta.current = { x: snappedDx, y: snappedDy }
      }
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
    // Pan cleanup
    if (isPanning.current) {
      isPanning.current = false
      return
    }

    // Rotation cleanup
    if (isRotating.current) {
      isRotating.current = false
      rotateSnapshots.current = new Map()
      rotateTargetIds.current = new Set()
      return
    }

    // Polygon handle drag cleanup
    if (polygonHandleDrag.current) {
      polygonHandleDrag.current = null
      return
    }

    // Line/Arrow handle drag cleanup
    if (lineArrowHandleDrag.current) {
      lineArrowHandleDrag.current = null
      return
    }

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
          const wb = obj.rotation ? getRotatedBounds(obj) : getWorldBounds(obj)
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
    dragStartCursor.current = null
    dragRefPoint.current = null
    dragAppliedDelta.current = { x: 0, y: 0 }
    dragTarget.current = null
  }, [])

  return { onPointerDown, onPointerMove, onPointerUp }
}
