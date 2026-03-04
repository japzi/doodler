import { useCallback } from 'react'
import { useStore } from '../store/useStore'
import type { Point } from '../types/scene'
import { snapToGrid } from '../utils/grid'

export function useTextTool() {
  const onPointerDown = useCallback((e: React.PointerEvent, scenePoint: Point) => {
    const { activeTextInput, editingTextId } = useStore.getState()
    // Don't open a new input if one is already active
    if (activeTextInput || editingTextId) return
    // Prevent the browser from shifting focus away from the textarea that's about to appear
    e.preventDefault()
    const sp = snapToGrid(scenePoint)
    useStore.getState().setActiveTextInput({ x: sp.x, y: sp.y })
  }, [])

  const onPointerMove = useCallback(() => {}, [])
  const onPointerUp = useCallback(() => {}, [])

  return { onPointerDown, onPointerMove, onPointerUp }
}
