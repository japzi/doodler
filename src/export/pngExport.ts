import type { SceneObject } from '../types/scene'
import { serializeToSvg } from './svgExport'

export async function exportPng(
  objects: SceneObject[],
  scale: number,
  transparent: boolean,
): Promise<void> {
  const svg = await serializeToSvg(objects)

  // Parse viewBox to get natural dimensions
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/)
  if (!viewBoxMatch) return
  const [, , w, h] = viewBoxMatch[1].split(' ').map(Number)

  const canvasW = Math.round(w * scale)
  const canvasH = Math.round(h * scale)

  // Inject width/height so the <img> knows the intrinsic size
  const sizedSvg = svg.replace(
    '<svg ',
    `<svg width="${canvasW}" height="${canvasH}" `,
  )

  // Use data URI instead of blob URL to avoid cross-origin canvas tainting
  const dataUri =
    'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sizedSvg)

  const img = new Image()

  await new Promise<void>((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = canvasW
      canvas.height = canvasH
      const ctx = canvas.getContext('2d')!
      if (!transparent) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvasW, canvasH)
      }
      ctx.drawImage(img, 0, 0, canvasW, canvasH)

      const pngDataUrl = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = pngDataUrl
      a.download = 'doodler-drawing.png'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      resolve()
    }
    img.onerror = () => {
      reject(new Error('Failed to load SVG image'))
    }
    img.src = dataUri
  })
}
