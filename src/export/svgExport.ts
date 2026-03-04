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

function computeWorldBoundsRecursive(obj: SceneObject, offsetX: number, offsetY: number, bounds: { minX: number; minY: number; maxX: number; maxY: number }) {
  const ox = offsetX + obj.position.x
  const oy = offsetY + obj.position.y
  if (obj.type === 'group') {
    for (const child of obj.children) {
      computeWorldBoundsRecursive(child, ox, oy, bounds)
    }
  } else {
    const bb = obj.boundingBox
    bounds.minX = Math.min(bounds.minX, bb.x + ox)
    bounds.minY = Math.min(bounds.minY, bb.y + oy)
    bounds.maxX = Math.max(bounds.maxX, bb.x + bb.width + ox)
    bounds.maxY = Math.max(bounds.maxY, bb.y + bb.height + oy)
  }
}

function serializeObject(obj: SceneObject, indent: string): string {
  if (obj.type === 'text') {
    return serializeTextObject(obj, indent)
  }
  if (obj.type === 'group') {
    return serializeGroupObject(obj, indent)
  }

  const tx = obj.position.x
  const ty = obj.position.y
  const transform = tx !== 0 || ty !== 0 ? ` transform="translate(${tx}, ${ty})"` : ''
  const isShape = obj.type !== 'pen'

  if (isShape) {
    const fillColor = 'fillColor' in obj && obj.fillColor && obj.fillColor !== 'transparent' ? obj.fillColor : 'none'
    const sw = 'strokeWidth' in obj && obj.strokeWidth ? obj.strokeWidth : 2
    const strokePath = `${indent}<path d="${obj.pathData}" fill="none" stroke="${obj.color}" stroke-width="${sw}"/>`

    if (fillColor !== 'none' && (obj.type === 'rectangle' || obj.type === 'ellipse')) {
      const fillOpacityAttr = obj.opacity !== undefined && obj.opacity !== 1 ? ` opacity="${obj.opacity}"` : ''
      let fillEl = ''
      if (obj.type === 'rectangle') {
        fillEl = `${indent}  <rect x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}" fill="${fillColor}" stroke="none"${fillOpacityAttr}/>`
      } else {
        fillEl = `${indent}  <path d="${obj.pathData}" fill="${fillColor}" stroke="none"${fillOpacityAttr}/>`
      }
      return `${indent}<g${transform}>\n${fillEl}\n${strokePath}\n${indent}</g>`
    }

    return `${indent}<path d="${obj.pathData}" fill="none" stroke="${obj.color}" stroke-width="${sw}"${transform}/>`
  }
  return `${indent}<path d="${obj.pathData}" fill="${obj.color}"${transform}/>`
}

function serializeGroupObject(obj: SceneObject & { type: 'group' }, indent: string): string {
  const tx = obj.position.x
  const ty = obj.position.y
  const transform = tx !== 0 || ty !== 0 ? ` transform="translate(${tx}, ${ty})"` : ''
  const childrenSvg = obj.children.map((child: SceneObject) => serializeObject(child, indent + '  ')).join('\n')
  return `${indent}<g${transform}>\n${childrenSvg}\n${indent}</g>`
}

function serializeTextObject(obj: TextObject, indent: string = '  '): string {
  const tx = obj.position.x
  const ty = obj.position.y
  const transform = tx !== 0 || ty !== 0 ? ` transform="translate(${tx}, ${ty})"` : ''
  const lines = obj.text.split('\n')
  const lineHeight = obj.fontSize * LINE_HEIGHT_FACTOR

  const tspans = lines
    .map((line, i) => {
      const dy = i === 0 ? '' : ` dy="${lineHeight}"`
      return `${indent}  <tspan x="0"${dy}>${escapeXml(line)}</tspan>`
    })
    .join('\n')

  return `${indent}<text font-family="'Humor Sans', cursive" font-size="${obj.fontSize}" fill="${obj.color}"${transform}>\n${tspans}\n${indent}</text>`
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

  const bounds = { minX, minY, maxX, maxY }
  for (const obj of objects) {
    computeWorldBoundsRecursive(obj, 0, 0, bounds)
  }
  minX = bounds.minX
  minY = bounds.minY
  maxX = bounds.maxX
  maxY = bounds.maxY

  const vbX = minX - padding
  const vbY = minY - padding
  const vbW = maxX - minX + padding * 2
  const vbH = maxY - minY + padding * 2

  const hasTextRecursive = (objs: SceneObject[]): boolean =>
    objs.some((o) => o.type === 'text' || (o.type === 'group' && hasTextRecursive(o.children)))
  const hasText = hasTextRecursive(objects)
  let styleBlock = ''
  if (hasText) {
    const fontBase64 = await getFontBase64()
    styleBlock = `  <style>\n    @font-face {\n      font-family: 'Humor Sans';\n      src: url('data:font/truetype;base64,${fontBase64}') format('truetype');\n    }\n  </style>\n`
  }

  const elements = objects
    .map((obj) => serializeObject(obj, '  '))
    .join('\n')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX} ${vbY} ${vbW} ${vbH}">\n${styleBlock}${elements}\n</svg>`
}

export async function downloadSvg(objects: SceneObject[]): Promise<void> {
  const svg = await serializeToSvg(objects)
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'doodler-drawing.svg'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
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
