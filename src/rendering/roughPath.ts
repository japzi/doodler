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

export function generateRoughPolygon(points: { x: number; y: number }[]): string {
  if (points.length < 3) return ''
  const tuples: [number, number][] = points.map((p) => [p.x, p.y])
  const drawable = generator.polygon(tuples, defaultOptions)
  return drawableToPaths(drawable)
}

export function generateCloudOutlinePath(x: number, y: number, w: number, h: number): string {
  return [
    `M ${x + w * 0.15} ${y + h * 0.85}`,
    // Bottom (flat-ish, slight upward curve)
    `C ${x + w * 0.25} ${y + h * 0.95}, ${x + w * 0.75} ${y + h * 0.95}, ${x + w * 0.85} ${y + h * 0.85}`,
    // Right side
    `C ${x + w * 1.05} ${y + h * 0.75}, ${x + w * 1.05} ${y + h * 0.45}, ${x + w * 0.85} ${y + h * 0.35}`,
    // Top-right bump
    `C ${x + w * 0.95} ${y + h * 0.1}, ${x + w * 0.75} ${y - h * 0.02}, ${x + w * 0.6} ${y + h * 0.12}`,
    // Top-center bump
    `C ${x + w * 0.55} ${y - h * 0.05}, ${x + w * 0.35} ${y - h * 0.05}, ${x + w * 0.3} ${y + h * 0.15}`,
    // Top-left bump
    `C ${x + w * 0.15} ${y + h * 0.0}, ${x - w * 0.05} ${y + h * 0.15}, ${x + w * 0.05} ${y + h * 0.35}`,
    // Left side
    `C ${x - w * 0.08} ${y + h * 0.5}, ${x - w * 0.05} ${y + h * 0.75}, ${x + w * 0.15} ${y + h * 0.85}`,
    'Z',
  ].join(' ')
}

export function generateRoughCloud(x: number, y: number, w: number, h: number): string {
  const path = generateCloudOutlinePath(x, y, w, h)
  const drawable = generator.path(path, defaultOptions)
  return drawableToPaths(drawable)
}

export function generateRoughHatchLines(x: number, y: number, w: number, h: number, spacing = 8): string[] {
  const step = spacing * Math.SQRT2
  const maxC = w + h
  const paths: string[] = []

  for (let c = step, i = 0; c < maxC; c += step, i++) {
    // Diagonal (/) lines from lower-left to upper-right
    const x1 = c <= h ? x : x + (c - h)
    const y1 = c <= h ? y + c : y + h
    const x2 = c <= w ? x + c : x + w
    const y2 = c <= w ? y : y + (c - w)

    const drawable = generator.line(x1, y1, x2, y2, {
      ...defaultOptions,
      strokeWidth: 1.5,
      seed: 42 + i,
    })
    paths.push(drawableToPaths(drawable))
  }

  return paths
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
