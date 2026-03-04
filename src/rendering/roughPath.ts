import rough from 'roughjs'
import type { Options } from 'roughjs/bin/core'

const generator = rough.generator()

const defaultOptions: Options = {
  roughness: 1.5,
  strokeWidth: 2,
  bowing: 1,
}

function drawableToPaths(drawable: ReturnType<typeof generator.line>): string {
  const pathInfos = generator.toPaths(drawable)
  return pathInfos.map((p) => p.d).join(' ')
}

export function generateRoughRect(x: number, y: number, w: number, h: number): string {
  const drawable = generator.rectangle(x, y, w, h, defaultOptions)
  return drawableToPaths(drawable)
}

export function generateRoughEllipse(cx: number, cy: number, w: number, h: number): string {
  const drawable = generator.ellipse(cx, cy, w, h, defaultOptions)
  return drawableToPaths(drawable)
}

export function generateRoughLine(x1: number, y1: number, x2: number, y2: number): string {
  const drawable = generator.line(x1, y1, x2, y2, defaultOptions)
  return drawableToPaths(drawable)
}

export function generateRoughCurvedLine(
  x1: number, y1: number,
  cp1x: number, cp1y: number,
  cp2x: number, cp2y: number,
  x2: number, y2: number,
): string {
  const drawable = generator.path(
    `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`,
    defaultOptions,
  )
  return drawableToPaths(drawable)
}

export function generateRoughArrow(x1: number, y1: number, x2: number, y2: number, headLength = 16): string {
  // Main line
  const lineDrawable = generator.line(x1, y1, x2, y2, defaultOptions)
  const linePath = drawableToPaths(lineDrawable)

  // Arrowhead: two short lines from the tip
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const headAngle = Math.PI / 6 // 30 degrees

  const ax = x2 - headLength * Math.cos(angle - headAngle)
  const ay = y2 - headLength * Math.sin(angle - headAngle)
  const bx = x2 - headLength * Math.cos(angle + headAngle)
  const by = y2 - headLength * Math.sin(angle + headAngle)

  const head1 = generator.line(x2, y2, ax, ay, defaultOptions)
  const head2 = generator.line(x2, y2, bx, by, defaultOptions)

  return `${linePath} ${drawableToPaths(head1)} ${drawableToPaths(head2)}`
}

export function generateRoughCurvedArrow(
  x1: number, y1: number,
  cp1x: number, cp1y: number,
  cp2x: number, cp2y: number,
  x2: number, y2: number,
  headLength = 16,
): string {
  // Curved shaft via cubic bezier path
  const shaftDrawable = generator.path(
    `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`,
    defaultOptions,
  )
  const shaftPath = drawableToPaths(shaftDrawable)

  // Arrowhead angle from bezier tangent at t=1
  let dx = x2 - cp2x
  let dy = y2 - cp2y
  // Fallback if tangent degenerates (cp2 == endpoint)
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    dx = x2 - x1
    dy = y2 - y1
  }
  const angle = Math.atan2(dy, dx)
  const headAngle = Math.PI / 6

  const ax = x2 - headLength * Math.cos(angle - headAngle)
  const ay = y2 - headLength * Math.sin(angle - headAngle)
  const bx = x2 - headLength * Math.cos(angle + headAngle)
  const by = y2 - headLength * Math.sin(angle + headAngle)

  const head1 = generator.line(x2, y2, ax, ay, defaultOptions)
  const head2 = generator.line(x2, y2, bx, by, defaultOptions)

  return `${shaftPath} ${drawableToPaths(head1)} ${drawableToPaths(head2)}`
}
