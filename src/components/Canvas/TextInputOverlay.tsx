import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '../../store/useStore'
import { generateId } from '../../utils/idGenerator'
import { measureTextBounds } from '../../utils/measureText'
import type { TextObject } from '../../types/scene'

export function TextInputOverlay() {
  const activeTextInput = useStore((s) => s.activeTextInput)
  const editingTextId = useStore((s) => s.editingTextId)
  const viewport = useStore((s) => s.viewport)
  const storeFontSize = useStore((s) => s.fontSize)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const committedRef = useRef(false)

  const editingObject = useStore((s) => {
    if (!s.editingTextId) return null
    return s.objects.find((o) => o.id === s.editingTextId) as TextObject | undefined ?? null
  })

  const isActive = activeTextInput !== null || editingTextId !== null

  // Compute screen position from scene coords
  const sceneX = editingObject ? editingObject.position.x : activeTextInput?.x ?? 0
  const sceneY = editingObject ? editingObject.position.y : activeTextInput?.y ?? 0
  const fontSize = editingObject?.fontSize ?? storeFontSize

  const screenX = sceneX * viewport.scale + viewport.offsetX
  const screenY = sceneY * viewport.scale + viewport.offsetY
  const scaledFontSize = fontSize * viewport.scale

  const commit = useCallback(() => {
    if (committedRef.current) return
    committedRef.current = true

    const textarea = textareaRef.current
    if (!textarea) return

    const text = textarea.value.trimEnd()
    const { editingTextId, activeTextInput, addObject, updateTextObject, deleteObjects, setActiveTextInput, setEditingTextId } = useStore.getState()

    if (editingTextId) {
      if (text === '') {
        deleteObjects(new Set([editingTextId]))
      } else {
        const bbox = measureTextBounds(text, fontSize)
        updateTextObject(editingTextId, text, bbox)
      }
      setEditingTextId(null)
    } else if (activeTextInput) {
      if (text !== '') {
        const state = useStore.getState()
        const currentFontSize = state.fontSize
        const bbox = measureTextBounds(text, currentFontSize)
        const obj: TextObject = {
          type: 'text',
          id: generateId(),
          text,
          fontSize: currentFontSize,
          color: state.strokeColor,
          opacity: state.opacity,
          position: { x: activeTextInput.x, y: activeTextInput.y },
          boundingBox: bbox,
        }
        addObject(obj)
      }
      setActiveTextInput(null)
    }
  }, [fontSize])

  // Reset committed flag and focus textarea when it appears
  useEffect(() => {
    if (isActive && textareaRef.current) {
      committedRef.current = false
      // Delay focus to next frame so the originating pointerdown is fully processed
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          if (editingObject) {
            textareaRef.current.value = editingObject.text
            textareaRef.current.select()
          }
        }
      })
    }
  }, [isActive, editingObject])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === 'Escape') {
      commit()
    }
  }, [commit])

  const handleBlur = useCallback(() => {
    // Small delay to avoid committing during focus handoff
    setTimeout(() => commit(), 0)
  }, [commit])

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.width = 'auto'
    textarea.style.height = textarea.scrollHeight + 'px'
    textarea.style.width = Math.max(textarea.scrollWidth, 60) + 'px'
  }, [])

  if (!isActive) return null

  return (
    <textarea
      ref={textareaRef}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onInput={handleInput}
      style={{
        position: 'fixed',
        left: screenX,
        top: screenY - scaledFontSize,
        font: `${scaledFontSize}px 'Humor Sans', cursive`,
        color: editingObject?.color ?? useStore.getState().strokeColor,
        background: 'transparent',
        border: '1px dashed #4a90d9',
        outline: 'none',
        padding: '2px 4px',
        margin: 0,
        resize: 'none',
        overflow: 'hidden',
        minWidth: '60px',
        minHeight: scaledFontSize + 8 + 'px',
        lineHeight: '1.3',
        zIndex: 1000,
        whiteSpace: 'pre',
      }}
    />
  )
}
