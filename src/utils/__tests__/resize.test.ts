import { describe, it, expect } from 'vitest'
import { applyResize } from '../resize'
import type { RectangleShape, LineShape, PolygonShape, ImageObject, GroupObject } from '../../types/scene'

function makeRect(overrides: Partial<RectangleShape> = {}): RectangleShape {
  return {
    type: 'rectangle',
    id: 'r1',
    x: 0, y: 0, width: 100, height: 50,
    color: '#000',
    pathData: '',
    position: { x: 0, y: 0 },
    boundingBox: { x: 0, y: 0, width: 100, height: 50 },
    ...overrides,
  }
}

function makeLine(overrides: Partial<LineShape> = {}): LineShape {
  return {
    type: 'line',
    id: 'l1',
    x1: 0, y1: 0, x2: 100, y2: 0,
    color: '#000',
    pathData: '',
    position: { x: 0, y: 0 },
    boundingBox: { x: 0, y: 0, width: 100, height: 0 },
    ...overrides,
  }
}

describe('applyResize', () => {
  describe('rectangle', () => {
    it('scales width and height from origin anchor', () => {
      const rect = makeRect()
      const result = applyResize(rect, { x: 0, y: 0 }, 2, 2)
      expect(result.type).toBe('rectangle')
      if (result.type !== 'rectangle') return
      expect(result.width).toBe(200)
      expect(result.height).toBe(100)
      expect(result.position).toEqual({ x: 0, y: 0 })
    })

    it('repositions around a non-origin anchor', () => {
      const rect = makeRect({ position: { x: 50, y: 50 } })
      const result = applyResize(rect, { x: 50, y: 50 }, 2, 2)
      if (result.type !== 'rectangle') return
      // Anchor is at (50,50), rect starts at world (50,50) so position stays at (50,50)
      expect(result.position).toEqual({ x: 50, y: 50 })
      expect(result.width).toBe(200)
      expect(result.height).toBe(100)
    })

    it('updates bounding box to match new dimensions', () => {
      const rect = makeRect()
      const result = applyResize(rect, { x: 0, y: 0 }, 3, 2)
      expect(result.boundingBox.width).toBe(300)
      expect(result.boundingBox.height).toBe(100)
    })
  })

  describe('line', () => {
    it('scales endpoints from origin anchor', () => {
      const line = makeLine()
      const result = applyResize(line, { x: 0, y: 0 }, 2, 1)
      if (result.type !== 'line') return
      // Original endpoints: world (0,0) to (100,0), scaled 2x horizontally
      expect(result.position.x + result.x2).toBeCloseTo(200)
    })

    it('scales a diagonal line', () => {
      const line = makeLine({
        x1: 0, y1: 0, x2: 100, y2: 100,
        boundingBox: { x: 0, y: 0, width: 100, height: 100 },
      })
      const result = applyResize(line, { x: 0, y: 0 }, 0.5, 0.5)
      if (result.type !== 'line') return
      const worldX2 = result.position.x + result.x2
      const worldY2 = result.position.y + result.y2
      expect(worldX2).toBeCloseTo(50)
      expect(worldY2).toBeCloseTo(50)
    })
  })

  describe('image', () => {
    function makeImage(overrides: Partial<ImageObject> = {}): ImageObject {
      return {
        type: 'image',
        id: 'img1',
        src: 'data:image/png;base64,abc',
        width: 200,
        height: 100,
        color: '#000',
        position: { x: 0, y: 0 },
        boundingBox: { x: 0, y: 0, width: 200, height: 100 },
        ...overrides,
      }
    }

    it('scales width and height from origin anchor', () => {
      const img = makeImage()
      const result = applyResize(img, { x: 0, y: 0 }, 2, 2)
      expect(result.type).toBe('image')
      if (result.type !== 'image') return
      expect(result.width).toBe(400)
      expect(result.height).toBe(200)
      expect(result.position).toEqual({ x: 0, y: 0 })
    })

    it('repositions around a non-origin anchor', () => {
      const img = makeImage({ position: { x: 50, y: 50 } })
      const result = applyResize(img, { x: 50, y: 50 }, 2, 2)
      if (result.type !== 'image') return
      expect(result.position).toEqual({ x: 50, y: 50 })
      expect(result.width).toBe(400)
      expect(result.height).toBe(200)
    })

    it('updates bounding box to match new dimensions', () => {
      const img = makeImage()
      const result = applyResize(img, { x: 0, y: 0 }, 3, 2)
      expect(result.boundingBox.width).toBe(600)
      expect(result.boundingBox.height).toBe(200)
    })

    it('preserves src and color', () => {
      const img = makeImage()
      const result = applyResize(img, { x: 0, y: 0 }, 2, 2)
      if (result.type !== 'image') return
      expect(result.src).toBe('data:image/png;base64,abc')
      expect(result.color).toBe('#000')
    })
  })

  describe('polygon', () => {
    function makePolygon(overrides: Partial<PolygonShape> = {}): PolygonShape {
      return {
        type: 'polygon',
        id: 'pg1',
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 50 },
          { x: 0, y: 50 },
        ],
        color: '#000',
        pathData: '',
        position: { x: 0, y: 0 },
        boundingBox: { x: 0, y: 0, width: 100, height: 50 },
        ...overrides,
      }
    }

    it('scales all vertices from origin anchor', () => {
      const poly = makePolygon()
      const result = applyResize(poly, { x: 0, y: 0 }, 2, 2)
      expect(result.type).toBe('polygon')
      if (result.type !== 'polygon') return
      // World point (100, 50) scaled 2x from origin → (200, 100)
      expect(result.boundingBox.width).toBeCloseTo(200)
      expect(result.boundingBox.height).toBeCloseTo(100)
      expect(result.position).toEqual({ x: 0, y: 0 })
    })

    it('repositions around a non-origin anchor', () => {
      const poly = makePolygon({ position: { x: 50, y: 50 } })
      const result = applyResize(poly, { x: 50, y: 50 }, 2, 2)
      if (result.type !== 'polygon') return
      expect(result.position).toEqual({ x: 50, y: 50 })
      expect(result.boundingBox.width).toBeCloseTo(200)
      expect(result.boundingBox.height).toBeCloseTo(100)
    })
  })

  describe('group', () => {
    it('recursively resizes children', () => {
      const child1 = makeRect({ id: 'c1', position: { x: 0, y: 0 }, width: 40, height: 20, boundingBox: { x: 0, y: 0, width: 40, height: 20 } })
      const child2 = makeRect({ id: 'c2', position: { x: 50, y: 0 }, width: 40, height: 20, boundingBox: { x: 0, y: 0, width: 40, height: 20 } })

      const group: GroupObject = {
        type: 'group',
        id: 'g1',
        children: [child1, child2],
        position: { x: 0, y: 0 },
        boundingBox: { x: 0, y: 0, width: 90, height: 20 },
      }

      const result = applyResize(group, { x: 0, y: 0 }, 2, 2)
      expect(result.type).toBe('group')
      if (result.type !== 'group') return

      // Group bounding box should be doubled
      expect(result.boundingBox.width).toBeCloseTo(180)
      expect(result.boundingBox.height).toBeCloseTo(40)

      // Children should have scaled dimensions
      const rc1 = result.children[0] as RectangleShape
      const rc2 = result.children[1] as RectangleShape
      expect(rc1.width).toBeCloseTo(80)
      expect(rc1.height).toBeCloseTo(40)
      expect(rc2.width).toBeCloseTo(80)
      expect(rc2.height).toBeCloseTo(40)
    })
  })
})
