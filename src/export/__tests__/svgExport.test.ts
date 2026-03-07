import { describe, it, expect, vi } from 'vitest'

// Mock roughPath (depends on canvas)
vi.mock('../../rendering/roughPath', () => ({
  generateRoughHatchLines: () => [],
}))

// Mock fontRegistry
vi.mock('../../fonts/fontRegistry', () => ({
  DEFAULT_FONT_FAMILY: 'sans-serif',
  isPresetFont: () => false,
  getPresetFont: () => null,
  getFontFamilyCss: (f: string) => f,
}))

import { serializeToSvg } from '../svgExport'
import type { ImageObject, RectangleShape } from '../../types/scene'

function makeImage(overrides: Partial<ImageObject> = {}): ImageObject {
  return {
    type: 'image',
    id: 'img1',
    src: 'data:image/png;base64,iVBORw0KGgo=',
    width: 200,
    height: 100,
    color: '#000',
    position: { x: 10, y: 20 },
    boundingBox: { x: 0, y: 0, width: 200, height: 100 },
    ...overrides,
  }
}

function makeRect(overrides: Partial<RectangleShape> = {}): RectangleShape {
  return {
    type: 'rectangle',
    id: 'r1',
    x: 0, y: 0, width: 100, height: 50,
    color: '#000',
    pathData: 'M0,0 L100,0 L100,50 L0,50 Z',
    position: { x: 0, y: 0 },
    boundingBox: { x: 0, y: 0, width: 100, height: 50 },
    ...overrides,
  }
}

describe('serializeToSvg with images', () => {
  it('embeds image as <image> element with base64 href', async () => {
    const svg = await serializeToSvg([makeImage()])
    expect(svg).toContain('<image ')
    expect(svg).toContain('href="data:image/png;base64,iVBORw0KGgo="')
    expect(svg).toContain('width="200"')
    expect(svg).toContain('height="100"')
  })

  it('includes image position as transform', async () => {
    const svg = await serializeToSvg([makeImage({ position: { x: 30, y: 40 } })])
    expect(svg).toContain('transform="translate(30, 40)"')
  })

  it('includes opacity attribute when not 1', async () => {
    const svg = await serializeToSvg([makeImage({ opacity: 0.5 })])
    expect(svg).toContain('opacity="0.5"')
  })

  it('omits opacity attribute when 1', async () => {
    const svg = await serializeToSvg([makeImage({ opacity: 1 })])
    expect(svg).not.toContain('opacity=')
  })

  it('includes images in viewBox bounds calculation', async () => {
    const img = makeImage({ position: { x: 500, y: 500 } })
    const svg = await serializeToSvg([img])
    // viewBox should encompass the image at (500,500) with size 200x100
    const match = svg.match(/viewBox="([^"]+)"/)
    expect(match).toBeTruthy()
    const [vbX, vbY, vbW, vbH] = match![1].split(' ').map(Number)
    // Image spans x: 500..700, y: 500..600, with 20px padding
    expect(vbX).toBe(480)
    expect(vbY).toBe(480)
    expect(vbW).toBe(240)
    expect(vbH).toBe(140)
  })

  it('renders both images and shapes together', async () => {
    const svg = await serializeToSvg([makeRect(), makeImage()])
    expect(svg).toContain('<path ')
    expect(svg).toContain('<image ')
  })

  it('returns fallback SVG for empty array', async () => {
    const svg = await serializeToSvg([])
    expect(svg).toBe('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>')
  })

  it('includes xlink namespace', async () => {
    const svg = await serializeToSvg([makeImage()])
    expect(svg).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"')
  })
})
