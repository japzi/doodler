export interface PresetFont {
  family: string
  file: string
  fallback: string
}

export const PRESET_FONTS: PresetFont[] = [
  { family: 'Humor Sans', file: '/fonts/HumorSans.ttf', fallback: 'cursive' },
  { family: 'Caveat', file: '/fonts/Caveat-Regular.ttf', fallback: 'cursive' },
  { family: 'Patrick Hand', file: '/fonts/PatrickHand-Regular.ttf', fallback: 'cursive' },
  { family: 'Indie Flower', file: '/fonts/IndieFlower-Regular.ttf', fallback: 'cursive' },
  { family: 'Shadows Into Light', file: '/fonts/ShadowsIntoLight-Regular.ttf', fallback: 'cursive' },
  { family: 'Architects Daughter', file: '/fonts/ArchitectsDaughter-Regular.ttf', fallback: 'cursive' },
  { family: 'Balsamiq Sans', file: '/fonts/BalsamiqSans-Regular.ttf', fallback: 'cursive' },
]

export const DEFAULT_FONT_FAMILY = 'Humor Sans'

const loadingCache = new Map<string, Promise<void>>()

export function isPresetFont(family: string): boolean {
  return PRESET_FONTS.some((f) => f.family === family)
}

export function getPresetFont(family: string): PresetFont | undefined {
  return PRESET_FONTS.find((f) => f.family === family)
}

export function getFontFamilyCss(family: string): string {
  const preset = getPresetFont(family)
  const fallback = preset?.fallback ?? 'cursive'
  return `'${family}', ${fallback}`
}

async function loadPresetFont(font: PresetFont): Promise<void> {
  const face = new FontFace(font.family, `url(${font.file})`)
  const loaded = await face.load()
  document.fonts.add(loaded)
}

async function loadGoogleFont(family: string): Promise<void> {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}&display=swap`
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = url
  document.head.appendChild(link)
  await document.fonts.load(`16px '${family}'`)
}

export async function ensureFontLoaded(family: string): Promise<void> {
  const existing = loadingCache.get(family)
  if (existing) return existing

  const preset = getPresetFont(family)
  const promise = preset ? loadPresetFont(preset) : loadGoogleFont(family)
  loadingCache.set(family, promise)

  try {
    await promise
  } catch (err) {
    loadingCache.delete(family)
    throw err
  }
}

export async function loadAllPresetFonts(): Promise<void> {
  await Promise.all(PRESET_FONTS.map((f) => ensureFontLoaded(f.family)))
}
