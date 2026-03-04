import type { Point } from '../types/scene'
import { useStore } from '../store/useStore'

const NICE_STEPS = [5, 10, 20, 50, 100, 200, 500, 1000]

export function getGridSize(scale: number): number {
  const screenGap = 20
  const baseGrid = screenGap / scale
  return NICE_STEPS.find((n) => n >= baseGrid) ?? NICE_STEPS[NICE_STEPS.length - 1]
}

export function snapToGrid(point: Point): Point {
  const { showGrid, viewport } = useStore.getState()
  if (!showGrid) return point
  const grid = getGridSize(viewport.scale)
  return {
    x: Math.round(point.x / grid) * grid,
    y: Math.round(point.y / grid) * grid,
  }
}
