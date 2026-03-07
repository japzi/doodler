import type { SceneObject, BoundingBox } from '../types/scene'

/** Rotate point (px, py) around center (cx, cy) by angleDeg degrees */
export function rotatePoint(px: number, py: number, cx: number, cy: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = px - cx
  const dy = py - cy
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  }
}

/** Snap angle to nearest 45° increment if within threshold */
export function snapAngle(angleDeg: number, threshold = 5): number {
  // Normalize to [0, 360)
  let a = ((angleDeg % 360) + 360) % 360
  const snapped = Math.round(a / 45) * 45
  const diff = Math.abs(a - snapped)
  if (diff <= threshold || diff >= 360 - threshold) {
    return snapped % 360
  }
  return angleDeg
}

/** Compute axis-aligned bounding box of a rotated object */
export function getRotatedBounds(obj: SceneObject): BoundingBox {
  const bb = obj.boundingBox
  const rotation = obj.rotation ?? 0
  if (rotation === 0) {
    return {
      x: obj.position.x + bb.x,
      y: obj.position.y + bb.y,
      width: bb.width,
      height: bb.height,
    }
  }

  const cx = obj.position.x + bb.x + bb.width / 2
  const cy = obj.position.y + bb.y + bb.height / 2

  const corners = [
    { x: obj.position.x + bb.x, y: obj.position.y + bb.y },
    { x: obj.position.x + bb.x + bb.width, y: obj.position.y + bb.y },
    { x: obj.position.x + bb.x + bb.width, y: obj.position.y + bb.y + bb.height },
    { x: obj.position.x + bb.x, y: obj.position.y + bb.y + bb.height },
  ]

  const rotated = corners.map((c) => rotatePoint(c.x, c.y, cx, cy, rotation))

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of rotated) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/** Get the world-space center of an object's bounding box */
export function getLocalCenter(obj: SceneObject): { x: number; y: number } {
  const bb = obj.boundingBox
  return {
    x: obj.position.x + bb.x + bb.width / 2,
    y: obj.position.y + bb.y + bb.height / 2,
  }
}
