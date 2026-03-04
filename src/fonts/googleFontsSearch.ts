interface GoogleFontEntry {
  family: string
  category: string
}

let catalog: GoogleFontEntry[] | null = null
let loadPromise: Promise<GoogleFontEntry[]> | null = null

async function loadCatalog(): Promise<GoogleFontEntry[]> {
  if (catalog) return catalog
  if (loadPromise) return loadPromise

  loadPromise = fetch('/google-fonts-list.json')
    .then((r) => r.json())
    .then((data: GoogleFontEntry[]) => {
      catalog = data
      return data
    })

  return loadPromise
}

export async function searchGoogleFonts(query: string, limit = 10): Promise<GoogleFontEntry[]> {
  const fonts = await loadCatalog()
  if (!query.trim()) return fonts.slice(0, limit)

  const q = query.toLowerCase()
  return fonts
    .filter((f) => f.family.toLowerCase().includes(q))
    .slice(0, limit)
}
