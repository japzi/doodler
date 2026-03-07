import type { SceneObject, Point } from '../types/scene'
import { generateRoughRect, generateRoughEllipse, generateRoughCloud, generateRoughLine, generateRoughCurvedLine, generateRoughArrow, generateRoughCurvedArrow, generateRoughPolygon } from '../rendering/roughPath'
import { generateStrokePathData } from '../rendering/sketchyPath'
import { boundingBoxFromRect, boundingBoxFromLine, boundingBoxFromCurvedArrow, boundingBoxFromPolygon, computeBoundingBox } from './boundingBox'
import { measureTextBounds } from './measureText'

function scalePoint(p: Point, anchor: Point, sx: number, sy: number): Point {
  return {
    x: anchor.x + (p.x - anchor.x) * sx,
    y: anchor.y + (p.y - anchor.y) * sy,
  }
}

function fixRotatedPosition(obj: SceneObject, resized: SceneObject, anchor: Point): SceneObject {
  const rotation = obj.rotation ?? 0
  if (rotation === 0) return resized

  const oldBB = obj.boundingBox
  const newBB = resized.boundingBox

  // Find which bbox corner is closest to the anchor (the "fixed" corner)
  const oldCorners = [
    { x: obj.position.x + oldBB.x, y: obj.position.y + oldBB.y },
    { x: obj.position.x + oldBB.x + oldBB.width, y: obj.position.y + oldBB.y },
    { x: obj.position.x + oldBB.x, y: obj.position.y + oldBB.y + oldBB.height },
    { x: obj.position.x + oldBB.x + oldBB.width, y: obj.position.y + oldBB.y + oldBB.height },
  ]
  const newCorners = [
    { x: resized.position.x + newBB.x, y: resized.position.y + newBB.y },
    { x: resized.position.x + newBB.x + newBB.width, y: resized.position.y + newBB.y },
    { x: resized.position.x + newBB.x, y: resized.position.y + newBB.y + newBB.height },
    { x: resized.position.x + newBB.x + newBB.width, y: resized.position.y + newBB.y + newBB.height },
  ]

  let minDist = Infinity, idx = 0
  for (let i = 0; i < oldCorners.length; i++) {
    const d = (oldCorners[i].x - anchor.x) ** 2 + (oldCorners[i].y - anchor.y) ** 2
    if (d < minDist) { minDist = d; idx = i }
  }

  const pOld = oldCorners[idx]
  const pNew = newCorners[idx]

  const oldCx = obj.position.x + oldBB.x + oldBB.width / 2
  const oldCy = obj.position.y + oldBB.y + oldBB.height / 2
  const newCx = resized.position.x + newBB.x + newBB.width / 2
  const newCy = resized.position.y + newBB.y + newBB.height / 2

  const rad = rotation * Math.PI / 180
  const cos = Math.cos(rad), sin = Math.sin(rad)

  // Visual position = center + rotate(corner - center, rotation)
  // Correction keeps the visual position of the anchor-side corner fixed
  const dpOldX = pOld.x - oldCx, dpOldY = pOld.y - oldCy
  const dpNewX = pNew.x - newCx, dpNewY = pNew.y - newCy

  const dx = (oldCx - newCx) + (dpOldX * cos - dpOldY * sin) - (dpNewX * cos - dpNewY * sin)
  const dy = (oldCy - newCy) + (dpOldX * sin + dpOldY * cos) - (dpNewX * sin + dpNewY * cos)

  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return resized

  return {
    ...resized,
    position: { x: resized.position.x + dx, y: resized.position.y + dy },
  }
}

export function applyResize(obj: SceneObject, anchor: Point, scaleX: number, scaleY: number): SceneObject {
  let resized: SceneObject
  switch (obj.type) {
    case 'rectangle': {
      const wx = obj.position.x + obj.x
      const wy = obj.position.y + obj.y
      const wx2 = wx + obj.width
      const wy2 = wy + obj.height
      const p1 = scalePoint({ x: wx, y: wy }, anchor, scaleX, scaleY)
      const p2 = scalePoint({ x: wx2, y: wy2 }, anchor, scaleX, scaleY)
      const nx = Math.min(p1.x, p2.x)
      const ny = Math.min(p1.y, p2.y)
      const nw = Math.abs(p2.x - p1.x)
      const nh = Math.abs(p2.y - p1.y)
      resized = {
        ...obj,
        x: 0, y: 0, width: nw, height: nh,
        position: { x: nx, y: ny },
        pathData: generateRoughRect(0, 0, nw, nh),
        boundingBox: boundingBoxFromRect(0, 0, nw, nh),
      }
      break
    }
    case 'cloud': {
      const wx = obj.position.x + obj.x
      const wy = obj.position.y + obj.y
      const wx2 = wx + obj.width
      const wy2 = wy + obj.height
      const p1 = scalePoint({ x: wx, y: wy }, anchor, scaleX, scaleY)
      const p2 = scalePoint({ x: wx2, y: wy2 }, anchor, scaleX, scaleY)
      const nx = Math.min(p1.x, p2.x)
      const ny = Math.min(p1.y, p2.y)
      const nw = Math.abs(p2.x - p1.x)
      const nh = Math.abs(p2.y - p1.y)
      resized = {
        ...obj,
        x: 0, y: 0, width: nw, height: nh,
        position: { x: nx, y: ny },
        pathData: generateRoughCloud(0, 0, nw, nh),
        boundingBox: boundingBoxFromRect(0, 0, nw, nh),
      }
      break
    }
    case 'ellipse': {
      const cx = obj.position.x + obj.x + obj.width / 2
      const cy = obj.position.y + obj.y + obj.height / 2
      const hw = obj.width / 2
      const hh = obj.height / 2
      const p1 = scalePoint({ x: cx - hw, y: cy - hh }, anchor, scaleX, scaleY)
      const p2 = scalePoint({ x: cx + hw, y: cy + hh }, anchor, scaleX, scaleY)
      const nx = Math.min(p1.x, p2.x)
      const ny = Math.min(p1.y, p2.y)
      const nw = Math.abs(p2.x - p1.x)
      const nh = Math.abs(p2.y - p1.y)
      resized = {
        ...obj,
        x: 0, y: 0, width: nw, height: nh,
        position: { x: nx, y: ny },
        pathData: generateRoughEllipse(nw / 2, nh / 2, nw, nh),
        boundingBox: boundingBoxFromRect(0, 0, nw, nh),
      }
      break
    }
    case 'line': {
      const wp1 = { x: obj.position.x + obj.x1, y: obj.position.y + obj.y1 }
      const wp2 = { x: obj.position.x + obj.x2, y: obj.position.y + obj.y2 }
      const np1 = scalePoint(wp1, anchor, scaleX, scaleY)
      const np2 = scalePoint(wp2, anchor, scaleX, scaleY)

      if (obj.cp1 && obj.cp2) {
        const wcp1 = { x: obj.position.x + obj.cp1.x, y: obj.position.y + obj.cp1.y }
        const wcp2 = { x: obj.position.x + obj.cp2.x, y: obj.position.y + obj.cp2.y }
        const ncp1 = scalePoint(wcp1, anchor, scaleX, scaleY)
        const ncp2 = scalePoint(wcp2, anchor, scaleX, scaleY)
        const ox = Math.min(np1.x, np2.x, ncp1.x, ncp2.x)
        const oy = Math.min(np1.y, np2.y, ncp1.y, ncp2.y)
        const lx1 = np1.x - ox, ly1 = np1.y - oy
        const lx2 = np2.x - ox, ly2 = np2.y - oy
        const lcp1 = { x: ncp1.x - ox, y: ncp1.y - oy }
        const lcp2 = { x: ncp2.x - ox, y: ncp2.y - oy }
        resized = {
          ...obj,
          x1: lx1, y1: ly1, x2: lx2, y2: ly2,
          cp1: lcp1, cp2: lcp2,
          position: { x: ox, y: oy },
          pathData: generateRoughCurvedLine(lx1, ly1, lcp1.x, lcp1.y, lcp2.x, lcp2.y, lx2, ly2),
          boundingBox: boundingBoxFromCurvedArrow(lx1, ly1, lcp1.x, lcp1.y, lcp2.x, lcp2.y, lx2, ly2),
        }
      } else {
        const ox = Math.min(np1.x, np2.x)
        const oy = Math.min(np1.y, np2.y)
        const lx1 = np1.x - ox
        const ly1 = np1.y - oy
        const lx2 = np2.x - ox
        const ly2 = np2.y - oy
        resized = {
          ...obj,
          x1: lx1, y1: ly1, x2: lx2, y2: ly2,
          position: { x: ox, y: oy },
          pathData: generateRoughLine(lx1, ly1, lx2, ly2),
          boundingBox: boundingBoxFromLine(lx1, ly1, lx2, ly2),
        }
      }
      break
    }
    case 'arrow': {
      const wp1 = { x: obj.position.x + obj.x1, y: obj.position.y + obj.y1 }
      const wp2 = { x: obj.position.x + obj.x2, y: obj.position.y + obj.y2 }
      const np1 = scalePoint(wp1, anchor, scaleX, scaleY)
      const np2 = scalePoint(wp2, anchor, scaleX, scaleY)

      if (obj.cp1 && obj.cp2) {
        const wcp1 = { x: obj.position.x + obj.cp1.x, y: obj.position.y + obj.cp1.y }
        const wcp2 = { x: obj.position.x + obj.cp2.x, y: obj.position.y + obj.cp2.y }
        const ncp1 = scalePoint(wcp1, anchor, scaleX, scaleY)
        const ncp2 = scalePoint(wcp2, anchor, scaleX, scaleY)
        const ox = Math.min(np1.x, np2.x, ncp1.x, ncp2.x)
        const oy = Math.min(np1.y, np2.y, ncp1.y, ncp2.y)
        const lx1 = np1.x - ox, ly1 = np1.y - oy
        const lx2 = np2.x - ox, ly2 = np2.y - oy
        const lcp1 = { x: ncp1.x - ox, y: ncp1.y - oy }
        const lcp2 = { x: ncp2.x - ox, y: ncp2.y - oy }
        resized = {
          ...obj,
          x1: lx1, y1: ly1, x2: lx2, y2: ly2,
          cp1: lcp1, cp2: lcp2,
          position: { x: ox, y: oy },
          pathData: generateRoughCurvedArrow(lx1, ly1, lcp1.x, lcp1.y, lcp2.x, lcp2.y, lx2, ly2, obj.arrowHeadSize),
          boundingBox: boundingBoxFromCurvedArrow(lx1, ly1, lcp1.x, lcp1.y, lcp2.x, lcp2.y, lx2, ly2),
        }
      } else {
        const ox = Math.min(np1.x, np2.x)
        const oy = Math.min(np1.y, np2.y)
        const lx1 = np1.x - ox
        const ly1 = np1.y - oy
        const lx2 = np2.x - ox
        const ly2 = np2.y - oy
        resized = {
          ...obj,
          x1: lx1, y1: ly1, x2: lx2, y2: ly2,
          position: { x: ox, y: oy },
          pathData: generateRoughArrow(lx1, ly1, lx2, ly2, obj.arrowHeadSize),
          boundingBox: boundingBoxFromLine(lx1, ly1, lx2, ly2),
        }
      }
      break
    }
    case 'polygon': {
      const scaledPoints = obj.points.map((p) => {
        const wp = { x: obj.position.x + p.x, y: obj.position.y + p.y }
        return scalePoint(wp, anchor, scaleX, scaleY)
      })
      const bbox = boundingBoxFromPolygon(scaledPoints)
      const normalizedPoints = scaledPoints.map((p) => ({
        x: p.x - bbox.x,
        y: p.y - bbox.y,
      }))
      resized = {
        ...obj,
        points: normalizedPoints,
        position: { x: bbox.x, y: bbox.y },
        pathData: generateRoughPolygon(normalizedPoints),
        boundingBox: { x: 0, y: 0, width: bbox.width, height: bbox.height },
      }
      break
    }
    case 'pen': {
      const scaledPoints = obj.points.map((p) => {
        const wp = { x: obj.position.x + p.x, y: obj.position.y + p.y }
        const sp = scalePoint(wp, anchor, scaleX, scaleY)
        return { x: sp.x, y: sp.y, pressure: p.pressure }
      })
      const bb = computeBoundingBox(scaledPoints)
      const localPoints = scaledPoints.map((p) => ({
        x: p.x - bb.x,
        y: p.y - bb.y,
        pressure: p.pressure,
      }))
      resized = {
        ...obj,
        points: localPoints,
        position: { x: bb.x, y: bb.y },
        pathData: generateStrokePathData(localPoints, (obj.strokeWidth ?? 2) * 3),
        boundingBox: computeBoundingBox(localPoints),
      }
      break
    }
    case 'group': {
      const gx = obj.position.x
      const gy = obj.position.y
      const resizedChildren = obj.children.map((child) => {
        const worldChild = { ...child, position: { x: child.position.x + gx, y: child.position.y + gy } }
        return applyResize(worldChild, anchor, scaleX, scaleY)
      })

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const child of resizedChildren) {
        const bb = child.boundingBox
        minX = Math.min(minX, child.position.x + bb.x)
        minY = Math.min(minY, child.position.y + bb.y)
        maxX = Math.max(maxX, child.position.x + bb.x + bb.width)
        maxY = Math.max(maxY, child.position.y + bb.y + bb.height)
      }

      const newGroupPos = { x: minX, y: minY }
      const relativeChildren = resizedChildren.map((child) => ({
        ...child,
        position: { x: child.position.x - newGroupPos.x, y: child.position.y - newGroupPos.y },
      }))

      resized = {
        ...obj,
        children: relativeChildren,
        position: newGroupPos,
        boundingBox: { x: 0, y: 0, width: maxX - minX, height: maxY - minY },
      }
      break
    }
    case 'image': {
      const wx = obj.position.x
      const wy = obj.position.y
      const wx2 = wx + obj.width
      const wy2 = wy + obj.height
      const p1 = scalePoint({ x: wx, y: wy }, anchor, scaleX, scaleY)
      const p2 = scalePoint({ x: wx2, y: wy2 }, anchor, scaleX, scaleY)
      const nx = Math.min(p1.x, p2.x)
      const ny = Math.min(p1.y, p2.y)
      const nw = Math.abs(p2.x - p1.x)
      const nh = Math.abs(p2.y - p1.y)
      resized = {
        ...obj,
        width: nw, height: nh,
        position: { x: nx, y: ny },
        boundingBox: { x: 0, y: 0, width: nw, height: nh },
      }
      break
    }
    case 'text': {
      const wp = { x: obj.position.x, y: obj.position.y }
      const sp = scalePoint(wp, anchor, scaleX, scaleY)
      const newFontSize = Math.max(8, Math.round(obj.fontSize * Math.abs(scaleY)))
      const newBb = measureTextBounds(obj.text, newFontSize, obj.fontFamily, obj.bold ?? false, obj.italic ?? false)
      resized = {
        ...obj,
        position: sp,
        fontSize: newFontSize,
        boundingBox: newBb,
      }
      break
    }
  }

  return fixRotatedPosition(obj, resized, anchor)
}
