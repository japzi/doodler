import type { SceneObject, TextObject } from '../types/scene'

const LINE_HEIGHT_FACTOR = 1.3

let cachedFontBase64: string | null = null

async function getFontBase64(): Promise<string> {
  if (cachedFontBase64) return cachedFontBase64
  const response = await fetch('/fonts/HumorSans.ttf')
  const buffer = await response.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  cachedFontBase64 = btoa(binary)
  return cachedFontBase64
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function serializeTextObject(obj: TextObject): string {
  const tx = obj.position.x
  const ty = obj.position.y
  const transform = tx !== 0 || ty !== 0 ? ` transform="translate(${tx}, ${ty})"` : ''
  const lines = obj.text.split('\n')
  const lineHeight = obj.fontSize * LINE_HEIGHT_FACTOR

  const tspans = lines
    .map((line, i) => {
      const dy = i === 0 ? '' : ` dy="${lineHeight}"`
      return `    <tspan x="0"${dy}>${escapeXml(line)}</tspan>`
    })
    .join('\n')

  return `  <text font-family="'Humor Sans', cursive" font-size="${obj.fontSize}" fill="${obj.color}"${transform}>\n${tspans}\n  </text>`
}

export async function serializeToSvg(objects: SceneObject[]): Promise<string> {
  if (objects.length === 0) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>'
  }

  const padding = 20
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const obj of objects) {
    const bb = obj.boundingBox
    const ox = obj.position.x
    const oy = obj.position.y
    minX = Math.min(minX, bb.x + ox)
    minY = Math.min(minY, bb.y + oy)
    maxX = Math.max(maxX, bb.x + bb.width + ox)
    maxY = Math.max(maxY, bb.y + bb.height + oy)
  }

  const vbX = minX - padding
  const vbY = minY - padding
  const vbW = maxX - minX + padding * 2
  const vbH = maxY - minY + padding * 2

  const hasText = objects.some((o) => o.type === 'text')
  let styleBlock = ''
  if (hasText) {
    const fontBase64 = await getFontBase64()
    styleBlock = `  <style>\n    @font-face {\n      font-family: 'Humor Sans';\n      src: url('data:font/truetype;base64,${fontBase64}') format('truetype');\n    }\n  </style>\n`
  }

  const elements = objects
    .map((obj) => {
      if (obj.type === 'text') {
        return serializeTextObject(obj)
      }

      const tx = obj.position.x
      const ty = obj.position.y
      const transform = tx !== 0 || ty !== 0 ? ` transform="translate(${tx}, ${ty})"` : ''
      const isShape = obj.type !== 'pen'

      if (isShape) {
        return `  <path d="${obj.pathData}" fill="none" stroke="${obj.color}" stroke-width="2"${transform}/>`
      }
      return `  <path d="${obj.pathData}" fill="${obj.color}"${transform}/>`
    })
    .join('\n')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX} ${vbY} ${vbW} ${vbH}">\n${styleBlock}${elements}\n</svg>`
}

export async function copySvgToClipboard(objects: SceneObject[]): Promise<boolean> {
  const svg = await serializeToSvg(objects)
  try {
    await navigator.clipboard.writeText(svg)
    return true
  } catch {
    return false
  }
}
