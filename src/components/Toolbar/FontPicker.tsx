import { useState, useRef, useEffect, useCallback } from 'react'
import './FontPicker.css'
import { PRESET_FONTS, ensureFontLoaded, getFontFamilyCss } from '../../fonts/fontRegistry'
import { searchGoogleFonts } from '../../fonts/googleFontsSearch'

interface FontPickerProps {
  value: string
  onChange: (family: string) => void
}

export function FontPicker({ value, onChange }: FontPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [googleResults, setGoogleResults] = useState<{ family: string }[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  // Debounced Google Fonts search
  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setGoogleResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      const results = await searchGoogleFonts(query, 8)
      setGoogleResults(results)
    }, 250)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, open])

  const handleSelect = useCallback(async (family: string) => {
    await ensureFontLoaded(family)
    onChange(family)
    setOpen(false)
    setQuery('')
  }, [onChange])

  const handleHover = useCallback((family: string) => {
    ensureFontLoaded(family).catch(() => {})
  }, [])

  return (
    <div className="font-picker" ref={containerRef}>
      <button
        className="font-picker__trigger"
        onClick={() => setOpen(!open)}
        style={{ fontFamily: getFontFamilyCss(value) }}
        title="Font family"
      >
        {value}
      </button>
      <span className="font-picker__label">Font</span>

      {open && (
        <div className="font-picker__popover">
          <div className="font-picker__section-label">Bundled fonts</div>
          <ul className="font-picker__list">
            {PRESET_FONTS.map((f) => (
              <li key={f.family}>
                <button
                  className={`font-picker__item ${f.family === value ? 'font-picker__item--active' : ''}`}
                  style={{ fontFamily: getFontFamilyCss(f.family) }}
                  onClick={() => handleSelect(f.family)}
                >
                  {f.family}
                </button>
              </li>
            ))}
          </ul>

          <div className="font-picker__section-label" style={{ marginTop: 6 }}>Google Fonts</div>
          <div className="font-picker__search-wrapper">
            <input
              className="font-picker__search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Google Fonts..."
              autoFocus
            />
          </div>

          {googleResults.length > 0 ? (
            <ul className="font-picker__list">
              {googleResults.map((f) => (
                <li key={f.family}>
                  <button
                    className={`font-picker__item ${f.family === value ? 'font-picker__item--active' : ''}`}
                    style={{ fontFamily: getFontFamilyCss(f.family) }}
                    onClick={() => handleSelect(f.family)}
                    onMouseEnter={() => handleHover(f.family)}
                  >
                    {f.family}
                  </button>
                </li>
              ))}
            </ul>
          ) : query.trim() ? (
            <div className="font-picker__empty">No results</div>
          ) : null}
        </div>
      )}
    </div>
  )
}
