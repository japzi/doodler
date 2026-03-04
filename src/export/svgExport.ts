import type { SceneObject, TextObject, RectangleShape, EllipseShape } from '../types/scene'
import { generateRoughHatchLines } from '../rendering/roughPath'
import { DEFAULT_FONT_FAMILY, getPresetFont, isPresetFont, getFontFamilyCss } from '../fonts/fontRegistry'

const LINE_HEIGHT_FACTOR = 1.3

const fontBase64Cache = new Map<string, string>()

async function fetchFontAsBase64(url: string): Promise<string> {
  if (fontBase64Cache.has(url)) return fontBase64Cache.get(url)!
  const response = await fetch(url)
  const buffer = await response.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64 = btoa(binary)
  fontBase64Cache.set(url, base64)
  return base64
}

function collectFontFamilies(objects: SceneObject[]): Set<string> {
  const families = new Set<string>()
  for (const obj of objects) {
    if (obj.type === 'text') {
      families.add(obj.fontFamily ?? DEFAULT_FONT_FAMILY)
    } else if (obj.type === 'group') {
      for (const family of collectFontFamilies(obj.children)) {
        families.add(family)
      }
    }
  }
  return families
}

async function buildFontFaceRules(families: Set<string>): Promise<string> {
  const rules: string[] = []
  for (const family of families) {
    if (isPresetFont(family)) {
      const preset = getPresetFont(family)!
      const base64 = await fetchFontAsBase64(preset.file)
      rules.push(`    @font-face {\n      font-family: '${family}';\n      src: url('data:font/truetype;base64,${base64}') format('truetype');\n    }`)
    } else {
      // Google Font: fetch CSS, extract font URL, fetch binary, embed
      try {
        const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}&display=swap`
        const cssResp = await fetch(cssUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
        const cssText = await cssResp.text()
        const urlMatch = cssText.match(/url\((https:\/\/[^)]+)\)/)
        if (urlMatch) {
          const fontUrl = urlMatch[1]
          const fontResp = await fetch(fontUrl)
          const fontBuf = await fontResp.arrayBuffer()
          const fontBytes = new Uint8Array(fontBuf)
          let bin = ''
          for (let i = 0; i < fontBytes.length; i++) {
            bin += String.fromCharCode(fontBytes[i])
          }
          const b64 = btoa(bin)
          const format = fontUrl.includes('.woff2') ? 'woff2' : fontUrl.includes('.woff') ? 'woff' : 'truetype'
          rules.push(`    @font-face {\n      font-family: '${family}';\n      src: url('data:font/${format};base64,${b64}') format('${format}');\n    }`)
        }
      } catch {
        // Skip font embedding if fetch fails
      }
    }
  }
  return rules.join('\n')
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
    const shadowOffset = (obj.type === 'rectangle' || obj.type === 'ellipse') && 'shadow' in obj && obj.shadow ? obj.shadow.offset : 0
    bounds.minX = Math.min(bounds.minX, bb.x + ox)
    bounds.minY = Math.min(bounds.minY, bb.y + oy)
    bounds.maxX = Math.max(bounds.maxX, bb.x + bb.width + ox + shadowOffset)
    bounds.maxY = Math.max(bounds.maxY, bb.y + bb.height + oy + shadowOffset)
  }
}

function serializeShadow(obj: RectangleShape | EllipseShape, indent: string): string {
  if (!obj.shadow) return ''
  const offset = obj.shadow.offset
  const sw = obj.strokeWidth ?? 2
  const clipId = `shadow-clip-${obj.id}`
  const hatchPaths = generateRoughHatchLines(obj.x, obj.y, obj.width, obj.height)

  let clipShape: string
  if (obj.type === 'rectangle') {
    clipShape = `${indent}      <rect x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}"/>`
  } else {
    const cx = obj.x + obj.width / 2
    const cy = obj.y + obj.height / 2
    clipShape = `${indent}      <ellipse cx="${cx}" cy="${cy}" rx="${obj.width / 2}" ry="${obj.height / 2}"/>`
  }

  const hatchLines = hatchPaths.map((d) => `${indent}      <path d="${d}" fill="none" stroke="${obj.color}" stroke-width="1.5"/>`).join('\n')
  const outlinePath = `${indent}    <path d="${obj.pathData}" fill="none" stroke="${obj.color}" stroke-width="${sw}"/>`

  return `${indent}  <g transform="translate(${offset}, ${offset})">\n${indent}    <defs>\n${indent}      <clipPath id="${clipId}">\n${clipShape}\n${indent}      </clipPath>\n${indent}    </defs>\n${indent}    <g clip-path="url(#${clipId})">\n${hatchLines}\n${indent}    </g>\n${outlinePath}\n${indent}  </g>`
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
    const hasShadow = (obj.type === 'rectangle' || obj.type === 'ellipse') && 'shadow' in obj && obj.shadow
    const shadowSvg = hasShadow ? serializeShadow(obj as RectangleShape | EllipseShape, indent) : ''
    const strokePath = `${indent}  <path d="${obj.pathData}" fill="none" stroke="${obj.color}" stroke-width="${sw}"/>`

    if (fillColor !== 'none' && (obj.type === 'rectangle' || obj.type === 'ellipse')) {
      const fillOpacityAttr = obj.opacity !== undefined && obj.opacity !== 1 ? ` opacity="${obj.opacity}"` : ''
      let fillEl = ''
      if (obj.type === 'rectangle') {
        fillEl = `${indent}  <rect x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}" fill="${fillColor}" stroke="none"${fillOpacityAttr}/>`
      } else {
        fillEl = `${indent}  <path d="${obj.pathData}" fill="${fillColor}" stroke="none"${fillOpacityAttr}/>`
      }
      return `${indent}<g${transform}>\n${shadowSvg ? shadowSvg + '\n' : ''}${fillEl}\n${strokePath}\n${indent}</g>`
    }

    if (hasShadow) {
      return `${indent}<g${transform}>\n${shadowSvg}\n${indent}  <path d="${obj.pathData}" fill="none" stroke="${obj.color}" stroke-width="${sw}"/>\n${indent}</g>`
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

  const fontCss = getFontFamilyCss(obj.fontFamily ?? DEFAULT_FONT_FAMILY)
  const boldAttr = obj.bold ? ' font-weight="bold"' : ''
  const italicAttr = obj.italic ? ' font-style="italic"' : ''
  const underlineAttr = obj.underline ? ' text-decoration="underline"' : ''
  return `${indent}<text font-family="${fontCss}" font-size="${obj.fontSize}"${boldAttr}${italicAttr}${underlineAttr} fill="${obj.color}"${transform}>\n${tspans}\n${indent}</text>`
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

  const fontFamilies = collectFontFamilies(objects)
  let styleBlock = ''
  if (fontFamilies.size > 0) {
    const fontRules = await buildFontFaceRules(fontFamilies)
    if (fontRules) {
      styleBlock = `  <style>\n${fontRules}\n  </style>\n`
    }
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
