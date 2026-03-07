import getStroke from 'perfect-freehand'
import type { Point } from '../types/scene'

const STROKE_OPTIONS = {
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  simulatePressure: true,
}

export function generateStrokePathData(points: Point[], size = 6): string {
  const strokePoints = getStroke(
    points.map((p) => [p.x, p.y, p.pressure ?? 0.5]),
    { ...STROKE_OPTIONS, size }
  )

  if (strokePoints.length === 0) return ''

  const d = strokePoints.reduce(
    (acc, [x, y], i, arr) => {
      if (i === 0) return `M ${x} ${y}`
      const [px, py] = arr[i - 1]
      const mx = (px + x) / 2
      const my = (py + y) / 2
      return `${acc} Q ${px} ${py}, ${mx} ${my}`
    },
    ''
  )

  return `${d} Z`
}
