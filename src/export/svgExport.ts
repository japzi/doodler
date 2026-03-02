import type { SceneObject } from '../types/scene'

export function serializeToSvg(objects: SceneObject[]): string {
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

  const paths = objects
    .map((obj) => {
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

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX} ${vbY} ${vbW} ${vbH}">\n${paths}\n</svg>`
}

export async function copySvgToClipboard(objects: SceneObject[]): Promise<boolean> {
  const svg = serializeToSvg(objects)
  try {
    await navigator.clipboard.writeText(svg)
    return true
  } catch {
    return false
  }
}
