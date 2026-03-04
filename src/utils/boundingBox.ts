import type { Point, BoundingBox, SceneObject } from '../types/scene'

export function boundingBoxFromRect(x: number, y: number, width: number, height: number): BoundingBox {
  return { x, y, width, height }
}

export function boundingBoxFromLine(x1: number, y1: number, x2: number, y2: number): BoundingBox {
  const minX = Math.min(x1, x2)
  const minY = Math.min(y1, y2)
  const maxX = Math.max(x1, x2)
  const maxY = Math.max(y1, y2)
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function boundingBoxFromCurvedArrow(
  x1: number, y1: number,
  cp1x: number, cp1y: number,
  cp2x: number, cp2y: number,
  x2: number, y2: number,
): BoundingBox {
  const minX = Math.min(x1, cp1x, cp2x, x2)
  const minY = Math.min(y1, cp1y, cp2y, y2)
  const maxX = Math.max(x1, cp1x, cp2x, x2)
  const maxY = Math.max(y1, cp1y, cp2y, y2)
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function computeBoundingBox(points: Point[]): BoundingBox {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

export function boxesIntersect(a: BoundingBox, b: BoundingBox): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

export function getWorldBounds(obj: SceneObject): BoundingBox {
  const bb = obj.boundingBox
  return {
    x: obj.position.x + bb.x,
    y: obj.position.y + bb.y,
    width: bb.width,
    height: bb.height,
  }
}
