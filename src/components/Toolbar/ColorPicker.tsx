import { useState, useRef, useEffect, useCallback } from 'react'
import './ColorPicker.css'

const PALETTE = [
  '#000000', '#434343', '#666666', '#999999',
  '#b7b7b7', '#cccccc', '#d9d9d9', '#ffffff',
  '#e06666', '#e69138', '#f1c232', '#6aa84f',
  '#45818e', '#3c78d8', '#674ea7', '#a64d79',
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  allowNone?: boolean
  label: string
}

export function ColorPicker({ value, onChange, allowNone, label }: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const [hexInput, setHexInput] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)
  const nativeRef = useRef<HTMLInputElement>(null)

  const isNone = value === 'transparent' || value === 'none'

  useEffect(() => {
    if (open) setHexInput(isNone ? '' : value)
  }, [open, value, isNone])

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

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const handleHexSubmit = useCallback(() => {
    const cleaned = hexInput.trim()
    if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) {
      onChange(cleaned)
    } else if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
      onChange('#' + cleaned)
    }
  }, [hexInput, onChange])

  return (
    <div className="color-picker" ref={containerRef}>
      <button
        className="color-picker__swatch"
        onClick={() => setOpen(!open)}
        title={label}
      >
        {isNone ? (
          <span className="color-picker__swatch-none" />
        ) : (
          <span className="color-picker__swatch-color" style={{ background: value }} />
        )}
      </button>
      <span className="color-picker__label">{label}</span>

      {open && (
        <div className="color-picker__popover">
          <div className="color-picker__palette">
            {PALETTE.map((c) => (
              <button
                key={c}
                className={`color-picker__palette-item ${c === value ? 'color-picker__palette-item--active' : ''}`}
                style={{ background: c }}
                onClick={() => { onChange(c); setOpen(false) }}
              />
            ))}
          </div>

          <div className="color-picker__hex-row">
            <input
              className="color-picker__hex-input"
              type="text"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { handleHexSubmit(); setOpen(false) } }}
              placeholder="#000000"
              maxLength={7}
            />
            <input
              ref={nativeRef}
              className="color-picker__native-input"
              type="color"
              value={isNone ? '#000000' : value}
              onChange={(e) => { onChange(e.target.value); setHexInput(e.target.value) }}
            />
          </div>

          {allowNone && (
            <button
              className="color-picker__none-btn"
              onClick={() => { onChange('transparent'); setOpen(false) }}
            >
              No fill
            </button>
          )}
        </div>
      )}
    </div>
  )
}
