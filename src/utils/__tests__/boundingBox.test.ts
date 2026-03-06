import { describe, it, expect } from 'vitest'
import {
  boundingBoxFromRect,
  boundingBoxFromLine,
  boundingBoxFromCurvedArrow,
  computeBoundingBox,
  boxesIntersect,
  getWorldBounds,
} from '../boundingBox'
import type { SceneObject, GroupObject } from '../../types/scene'

describe('boundingBoxFromRect', () => {
  it('returns the rect as a bounding box', () => {
    expect(boundingBoxFromRect(10, 20, 100, 50)).toEqual({
      x: 10, y: 20, width: 100, height: 50,
    })
  })
})

describe('boundingBoxFromLine', () => {
  it('normalizes a line going top-left to bottom-right', () => {
    expect(boundingBoxFromLine(0, 0, 100, 50)).toEqual({
      x: 0, y: 0, width: 100, height: 50,
    })
  })

  it('normalizes a line going bottom-right to top-left', () => {
    expect(boundingBoxFromLine(100, 50, 0, 0)).toEqual({
      x: 0, y: 0, width: 100, height: 50,
    })
  })

  it('handles a horizontal line', () => {
    expect(boundingBoxFromLine(10, 20, 80, 20)).toEqual({
      x: 10, y: 20, width: 70, height: 0,
    })
  })

  it('handles a vertical line', () => {
    expect(boundingBoxFromLine(5, 100, 5, 10)).toEqual({
      x: 5, y: 10, width: 0, height: 90,
    })
  })
})

describe('boundingBoxFromCurvedArrow', () => {
  it('expands bounding box to include control points', () => {
    const bb = boundingBoxFromCurvedArrow(10, 10, -5, 50, 120, 50, 100, 10)
    expect(bb).toEqual({ x: -5, y: 10, width: 125, height: 40 })
  })

  it('works when control points are inside the endpoints', () => {
    const bb = boundingBoxFromCurvedArrow(0, 0, 25, 25, 75, 75, 100, 100)
    expect(bb).toEqual({ x: 0, y: 0, width: 100, height: 100 })
  })
})

describe('computeBoundingBox', () => {
  it('returns zero box for empty array', () => {
    expect(computeBoundingBox([])).toEqual({ x: 0, y: 0, width: 0, height: 0 })
  })

  it('returns zero-size box for a single point', () => {
    expect(computeBoundingBox([{ x: 5, y: 10 }])).toEqual({
      x: 5, y: 10, width: 0, height: 0,
    })
  })

  it('computes bounding box for multiple points', () => {
    const points = [
      { x: 10, y: 20 },
      { x: 50, y: 5 },
      { x: 30, y: 60 },
    ]
    expect(computeBoundingBox(points)).toEqual({
      x: 10, y: 5, width: 40, height: 55,
    })
  })
})

describe('boxesIntersect', () => {
  it('detects overlapping boxes', () => {
    const a = { x: 0, y: 0, width: 20, height: 20 }
    const b = { x: 10, y: 10, width: 20, height: 20 }
    expect(boxesIntersect(a, b)).toBe(true)
  })

  it('returns false for non-overlapping boxes', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 }
    const b = { x: 20, y: 20, width: 10, height: 10 }
    expect(boxesIntersect(a, b)).toBe(false)
  })

  it('returns false for boxes that only touch at edges', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 }
    const b = { x: 10, y: 0, width: 10, height: 10 }
    expect(boxesIntersect(a, b)).toBe(false)
  })

  it('detects when one box contains another', () => {
    const outer = { x: 0, y: 0, width: 100, height: 100 }
    const inner = { x: 20, y: 20, width: 10, height: 10 }
    expect(boxesIntersect(outer, inner)).toBe(true)
    expect(boxesIntersect(inner, outer)).toBe(true)
  })
})

describe('getWorldBounds', () => {
  it('offsets bounding box by object position', () => {
    const obj: SceneObject = {
      type: 'rectangle',
      id: 'r1',
      x: 0, y: 0, width: 50, height: 30,
      color: '#000',
      pathData: '',
      position: { x: 100, y: 200 },
      boundingBox: { x: 0, y: 0, width: 50, height: 30 },
    }
    expect(getWorldBounds(obj)).toEqual({
      x: 100, y: 200, width: 50, height: 30,
    })
  })

  it('handles non-zero bounding box origin', () => {
    const obj: SceneObject = {
      type: 'line',
      id: 'l1',
      x1: 5, y1: 10, x2: 50, y2: 40,
      color: '#000',
      pathData: '',
      position: { x: 20, y: 30 },
      boundingBox: { x: 5, y: 10, width: 45, height: 30 },
    }
    expect(getWorldBounds(obj)).toEqual({
      x: 25, y: 40, width: 45, height: 30,
    })
  })

  it('works with groups', () => {
    const group: GroupObject = {
      type: 'group',
      id: 'g1',
      children: [],
      position: { x: 50, y: 60 },
      boundingBox: { x: 0, y: 0, width: 200, height: 100 },
    }
    expect(getWorldBounds(group)).toEqual({
      x: 50, y: 60, width: 200, height: 100,
    })
  })
})
