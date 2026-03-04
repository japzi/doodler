import type { BoundingBox } from '../types/scene'
import { DEFAULT_FONT_FAMILY, getFontFamilyCss } from '../fonts/fontRegistry'

let cachedCanvas: HTMLCanvasElement | null = null

function getCanvas(): CanvasRenderingContext2D {
  if (!cachedCanvas) {
    cachedCanvas = document.createElement('canvas')
  }
  return cachedCanvas.getContext('2d')!
}

const LINE_HEIGHT_FACTOR = 1.3

export function measureTextBounds(text: string, fontSize: number, fontFamily: string = DEFAULT_FONT_FAMILY, bold: boolean = false, italic: boolean = false): BoundingBox {
  const ctx = getCanvas()
  ctx.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${fontSize}px ${getFontFamilyCss(fontFamily)}`

  const lines = text.split('\n')
  let maxWidth = 0
  for (const line of lines) {
    const m = ctx.measureText(line)
    maxWidth = Math.max(maxWidth, m.width)
  }

  const lineHeight = fontSize * LINE_HEIGHT_FACTOR
  const height = lineHeight * lines.length

  return {
    x: 0,
    y: -fontSize,
    width: maxWidth,
    height,
  }
}
