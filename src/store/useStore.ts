import { create } from 'zustand'
import type { SceneObject, Point, ViewportTransform, ToolType, ShapePreview, BoundingBox } from '../types/scene'
import { generateId } from '../utils/idGenerator'
import { applyResize } from '../utils/resize'
import { getWorldBounds, boundingBoxFromLine, boundingBoxFromCurvedArrow } from '../utils/boundingBox'
import { generateRoughLine, generateRoughCurvedLine, generateRoughArrow, generateRoughCurvedArrow } from '../rendering/roughPath'

const STYLES_KEY = 'doodler-styles'
const DRAWING_KEY = 'doodler-drawing'

function loadDrawing(): { objects: SceneObject[]; viewport: ViewportTransform } | null {
  try {
    const raw = localStorage.getItem(DRAWING_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (Array.isArray(data.objects) && data.viewport) return data
    }
  } catch { /* ignore */ }
  return null
}

function persistDrawing(objects: SceneObject[], viewport: ViewportTransform) {
  try {
    localStorage.setItem(DRAWING_KEY, JSON.stringify({ objects, viewport }))
  } catch { /* ignore */ }
}

export function exportProject() {
  const { objects, viewport } = useStore.getState()
  const blob = new Blob([JSON.stringify({ version: 1, objects, viewport }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'doodler-drawing.json'
  a.click()
  URL.revokeObjectURL(url)
}

export function importProject(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string)
        if (!data.version || !Array.isArray(data.objects)) {
          reject(new Error('Invalid file format'))
          return
        }
        useStore.setState({
          objects: data.objects,
          viewport: data.viewport ?? { offsetX: 0, offsetY: 0, scale: 1 },
          selectedIds: new Set(),
          activeTextInput: null,
          editingTextId: null,
        })
        resolve()
      } catch {
        reject(new Error('Failed to parse file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

function loadStyles(): { strokeColor: string; fillColor: string; strokeWidth: number; opacity: number; fontSize: number; arrowHeadSize: number } {
  try {
    const raw = localStorage.getItem(STYLES_KEY)
    if (raw) return { strokeColor: '#000000', fillColor: 'transparent', strokeWidth: 2, opacity: 1, fontSize: 24, arrowHeadSize: 16, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { strokeColor: '#000000', fillColor: 'transparent', strokeWidth: 2, opacity: 1, fontSize: 24, arrowHeadSize: 16 }
}

function persistStyles(state: { strokeColor: string; fillColor: string; strokeWidth: number; opacity: number; fontSize: number; arrowHeadSize: number }) {
  try {
    localStorage.setItem(STYLES_KEY, JSON.stringify(state))
  } catch { /* ignore */ }
}

const savedStyles = loadStyles()
const savedDrawing = loadDrawing()

const MAX_HISTORY = 50

interface DoodlerState {
  // Scene
  objects: SceneObject[]
  selectedIds: Set<string>

  // History (undo/redo)
  _history: SceneObject[][]
  _future: SceneObject[][]

  // Tool
  activeTool: ToolType
  strokeColor: string
  fillColor: string
  strokeWidth: number
  opacity: number
  fontSize: number
  arrowHeadSize: number

  // Viewport
  viewport: ViewportTransform

  // In-progress drawing
  activeStrokePoints: Point[] | null
  activeShapePreview: ShapePreview | null

  // Text editing
  activeTextInput: { x: number; y: number } | null
  editingTextId: string | null

  // Marquee selection
  marqueeRect: BoundingBox | null

  // Actions
  saveSnapshot: () => void
  undo: () => void
  redo: () => void
  addObject: (obj: SceneObject) => void
  deleteObjects: (ids: Set<string>) => void
  moveObjects: (ids: Set<string>, dx: number, dy: number) => void
  updateTextObject: (id: string, text: string, boundingBox: BoundingBox) => void
  duplicateObjects: (ids: Set<string>) => void
  bringForward: (ids: Set<string>) => void
  bringToFront: (ids: Set<string>) => void
  sendBackward: (ids: Set<string>) => void
  sendToBack: (ids: Set<string>) => void
  resizeObjects: (snapshots: Map<string, SceneObject>, anchor: Point, scaleX: number, scaleY: number) => void
  matchSize: (ids: Set<string>, mode: 'width' | 'height' | 'both') => void
  alignObjects: (ids: Set<string>, alignment: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom') => void
  distributeObjects: (ids: Set<string>, axis: 'horizontal' | 'vertical') => void
  setSelectedIds: (ids: Set<string>) => void
  setMarqueeRect: (rect: BoundingBox | null) => void
  setActiveTool: (tool: ToolType) => void
  setStrokeColor: (color: string) => void
  setFillColor: (color: string) => void
  setStrokeWidth: (width: number) => void
  setOpacity: (opacity: number) => void
  setArrowHeadSize: (size: number) => void
  setFontSize: (size: number) => void
  setViewport: (viewport: ViewportTransform) => void
  setActiveStrokePoints: (points: Point[] | null) => void
  setActiveShapePreview: (preview: ShapePreview | null) => void
  setActiveTextInput: (input: { x: number; y: number } | null) => void
  setEditingTextId: (id: string | null) => void
  clearDrawing: () => void
  updateObjectStyles: (ids: Set<string>, styles: { color?: string; fillColor?: string; strokeWidth?: number; opacity?: number }) => void
  updateLineGeometry: (id: string, updates: Partial<{ x1: number; y1: number; x2: number; y2: number; cp1: { x: number; y: number }; cp2: { x: number; y: number } }>) => void
  updateArrowGeometry: (id: string, updates: Partial<{ x1: number; y1: number; x2: number; y2: number; cp1: { x: number; y: number }; cp2: { x: number; y: number } }>) => void
  updateArrowHeadSize: (ids: Set<string>, size: number) => void
}

export const useStore = create<DoodlerState>((set) => ({
  objects: savedDrawing?.objects ?? [],
  selectedIds: new Set(),
  activeTool: 'pen',
  strokeColor: savedStyles.strokeColor,
  fillColor: savedStyles.fillColor,
  strokeWidth: savedStyles.strokeWidth,
  opacity: savedStyles.opacity,
  fontSize: savedStyles.fontSize,
  arrowHeadSize: savedStyles.arrowHeadSize,
  viewport: savedDrawing?.viewport ?? { offsetX: 0, offsetY: 0, scale: 1 },
  activeStrokePoints: null,
  activeShapePreview: null,
  activeTextInput: null,
  editingTextId: null,
  marqueeRect: null,
  _history: [],
  _future: [],

  saveSnapshot: () =>
    set((state) => ({
      _history: [...state._history.slice(-(MAX_HISTORY - 1)), structuredClone(state.objects)],
      _future: [],
    })),

  undo: () =>
    set((state) => {
      if (state._history.length === 0) return state
      const previous = state._history[state._history.length - 1]
      return {
        _history: state._history.slice(0, -1),
        _future: [...state._future, structuredClone(state.objects)],
        objects: previous,
        selectedIds: new Set(),
      }
    }),

  redo: () =>
    set((state) => {
      if (state._future.length === 0) return state
      const next = state._future[state._future.length - 1]
      return {
        _future: state._future.slice(0, -1),
        _history: [...state._history, structuredClone(state.objects)],
        objects: next,
        selectedIds: new Set(),
      }
    }),

  addObject: (obj) =>
    set((state) => ({
      _history: [...state._history.slice(-(MAX_HISTORY - 1)), structuredClone(state.objects)],
      _future: [],
      objects: [...state.objects, obj],
    })),

  deleteObjects: (ids) =>
    set((state) => ({
      _history: [...state._history.slice(-(MAX_HISTORY - 1)), structuredClone(state.objects)],
      _future: [],
      objects: state.objects.filter((o) => !ids.has(o.id)),
      selectedIds: new Set(),
    })),

  moveObjects: (ids, dx, dy) =>
    set((state) => ({
      objects: state.objects.map((o) =>
        ids.has(o.id)
          ? { ...o, position: { x: o.position.x + dx, y: o.position.y + dy } }
          : o
      ),
    })),

  updateTextObject: (id, text, boundingBox) =>
    set((state) => ({
      _history: [...state._history.slice(-(MAX_HISTORY - 1)), structuredClone(state.objects)],
      _future: [],
      objects: state.objects.map((o) =>
        o.id === id && o.type === 'text' ? { ...o, text, boundingBox } : o
      ),
    })),

  duplicateObjects: (ids) =>
    set((state) => {
      const clones: SceneObject[] = []
      for (const obj of state.objects) {
        if (ids.has(obj.id)) {
          const clone = structuredClone(obj)
          clone.id = generateId()
          clone.position = { x: clone.position.x + 10, y: clone.position.y + 10 }
          clones.push(clone)
        }
      }
      return {
        _history: [...state._history.slice(-(MAX_HISTORY - 1)), structuredClone(state.objects)],
        _future: [],
        objects: [...state.objects, ...clones],
        selectedIds: new Set(clones.map((c) => c.id)),
      }
    }),

  bringForward: (ids) =>
    set((state) => {
      const arr = [...state.objects]
      for (let i = arr.length - 2; i >= 0; i--) {
        if (ids.has(arr[i].id) && !ids.has(arr[i + 1].id)) {
          ;[arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]
        }
      }
      return {
        _history: [...state._history.slice(-(MAX_HISTORY - 1)), structuredClone(state.objects)],
        _future: [],
        objects: arr,
      }
    }),

  bringToFront: (ids) =>
    set((state) => {
      const rest = state.objects.filter((o) => !ids.has(o.id))
      const moved = state.objects.filter((o) => ids.has(o.id))
      return {
        _history: [...state._history.slice(-(MAX_HISTORY - 1)), structuredClone(state.objects)],
        _future: [],
        objects: [...rest, ...moved],
      }
    }),

  sendBackward: (ids) =>
    set((state) => {
      const arr = [...state.objects]
      for (let i = 1; i < arr.length; i++) {
        if (ids.has(arr[i].id) && !ids.has(arr[i - 1].id)) {
          ;[arr[i], arr[i - 1]] = [arr[i - 1], arr[i]]
        }
      }
      return {
        _history: [...state._history.slice(-(MAX_HISTORY - 1)), structuredClone(state.objects)],
        _future: [],
        objects: arr,
      }
    }),

  sendToBack: (ids) =>
    set((state) => {
      const moved = state.objects.filter((o) => ids.has(o.id))
      const rest = state.objects.filter((o) => !ids.has(o.id))
      return {
        _history: [...state._history.slice(-(MAX_HISTORY - 1)), structuredClone(state.objects)],
        _future: [],
        objects: [...moved, ...rest],
      }
    }),

  resizeObjects: (snapshots, anchor, scaleX, scaleY) =>
    set((state) => ({
      objects: state.objects.map((o) => {
        const snap = snapshots.get(o.id)
        if (!snap) return o
        return applyResize(snap, anchor, scaleX, scaleY)
      }),
    })),

  matchSize: (ids, mode) =>
    set((state) => {
      const ref = state.objects.find((o) => ids.has(o.id))
      if (!ref) return state
      const refBounds = getWorldBounds(ref)
      if (refBounds.width === 0 || refBounds.height === 0) return state
      return {
        _history: [...state._history.slice(-(MAX_HISTORY - 1)), structuredClone(state.objects)],
        _future: [],
        objects: state.objects.map((o) => {
          if (!ids.has(o.id) || o.id === ref.id) return o
          const objBounds = getWorldBounds(o)
          if (objBounds.width === 0 || objBounds.height === 0) return o
          const cx = objBounds.x + objBounds.width / 2
          const cy = objBounds.y + objBounds.height / 2
          const sx = mode === 'height' ? 1 : refBounds.width / objBounds.width
          const sy = mode === 'width' ? 1 : refBounds.height / objBounds.height
          return applyResize(o, { x: cx, y: cy }, sx, sy)
        }),
      }
    }),

  alignObjects: (ids, alignment) =>
    set((state) => {
      const selected = state.objects.filter((o) => ids.has(o.id))
      if (selected.length < 2) return state
      const bounds = selected.map((o) => ({ id: o.id, wb: getWorldBounds(o) }))

      let target: number
      switch (alignment) {
        case 'left':
          target = Math.min(...bounds.map((b) => b.wb.x))
          break
        case 'right':
          target = Math.max(...bounds.map((b) => b.wb.x + b.wb.width))
          break
        case 'centerH': {
          const minX = Math.min(...bounds.map((b) => b.wb.x))
          const maxX = Math.max(...bounds.map((b) => b.wb.x + b.wb.width))
          target = (minX + maxX) / 2
          break
        }
        case 'top':
          target = Math.min(...bounds.map((b) => b.wb.y))
          break
        case 'bottom':
          target = Math.max(...bounds.map((b) => b.wb.y + b.wb.height))
          break
        case 'centerV': {
          const minY = Math.min(...bounds.map((b) => b.wb.y))
          const maxY = Math.max(...bounds.map((b) => b.wb.y + b.wb.height))
          target = (minY + maxY) / 2
          break
        }
      }

      const deltas = new Map<string, { dx: number; dy: number }>()
      for (const b of bounds) {
        let dx = 0, dy = 0
        switch (alignment) {
          case 'left': dx = target - b.wb.x; break
          case 'right': dx = target - (b.wb.x + b.wb.width); break
          case 'centerH': dx = target - (b.wb.x + b.wb.width / 2); break
          case 'top': dy = target - b.wb.y; break
          case 'bottom': dy = target - (b.wb.y + b.wb.height); break
          case 'centerV': dy = target - (b.wb.y + b.wb.height / 2); break
        }
        deltas.set(b.id, { dx, dy })
      }

      return {
        _history: [...state._history.slice(-(MAX_HISTORY - 1)), structuredClone(state.objects)],
        _future: [],
        objects: state.objects.map((o) => {
          const d = deltas.get(o.id)
          if (!d || (d.dx === 0 && d.dy === 0)) return o
          return { ...o, position: { x: o.position.x + d.dx, y: o.position.y + d.dy } }
        }),
      }
    }),

  distributeObjects: (ids, axis) =>
    set((state) => {
      const selected = state.objects.filter((o) => ids.has(o.id))
      if (selected.length < 3) return state
      const items = selected.map((o) => ({ id: o.id, wb: getWorldBounds(o) }))

      if (axis === 'horizontal') {
        items.sort((a, b) => (a.wb.x + a.wb.width / 2) - (b.wb.x + b.wb.width / 2))
      } else {
        items.sort((a, b) => (a.wb.y + a.wb.height / 2) - (b.wb.y + b.wb.height / 2))
      }

      const first = items[0].wb
      const last = items[items.length - 1].wb
      const totalObjSize = items.reduce((sum, it) => sum + (axis === 'horizontal' ? it.wb.width : it.wb.height), 0)
      const span = axis === 'horizontal'
        ? (last.x + last.width) - first.x
        : (last.y + last.height) - first.y
      const gap = (span - totalObjSize) / (items.length - 1)

      const deltas = new Map<string, { dx: number; dy: number }>()
      let cursor = axis === 'horizontal' ? first.x : first.y
      for (const item of items) {
        const current = axis === 'horizontal' ? item.wb.x : item.wb.y
        const d = cursor - current
        deltas.set(item.id, axis === 'horizontal' ? { dx: d, dy: 0 } : { dx: 0, dy: d })
        cursor += (axis === 'horizontal' ? item.wb.width : item.wb.height) + gap
      }

      return {
        _history: [...state._history.slice(-(MAX_HISTORY - 1)), structuredClone(state.objects)],
        _future: [],
        objects: state.objects.map((o) => {
          const d = deltas.get(o.id)
          if (!d || (d.dx === 0 && d.dy === 0)) return o
          return { ...o, position: { x: o.position.x + d.dx, y: o.position.y + d.dy } }
        }),
      }
    }),

  setSelectedIds: (ids) => set({ selectedIds: ids }),
  setMarqueeRect: (rect) => set({ marqueeRect: rect }),
  setActiveTool: (tool) => set({ activeTool: tool, selectedIds: new Set(), activeTextInput: null, editingTextId: null }),
  setStrokeColor: (color) => set((state) => {
    const styles = { strokeColor: color, fillColor: state.fillColor, strokeWidth: state.strokeWidth, opacity: state.opacity, fontSize: state.fontSize, arrowHeadSize: state.arrowHeadSize }
    persistStyles(styles)
    return { strokeColor: color }
  }),
  setFillColor: (color) => set((state) => {
    const styles = { strokeColor: state.strokeColor, fillColor: color, strokeWidth: state.strokeWidth, opacity: state.opacity, fontSize: state.fontSize, arrowHeadSize: state.arrowHeadSize }
    persistStyles(styles)
    return { fillColor: color }
  }),
  setStrokeWidth: (width) => set((state) => {
    const styles = { strokeColor: state.strokeColor, fillColor: state.fillColor, strokeWidth: width, opacity: state.opacity, fontSize: state.fontSize, arrowHeadSize: state.arrowHeadSize }
    persistStyles(styles)
    return { strokeWidth: width }
  }),
  setOpacity: (opacity) => set((state) => {
    const styles = { strokeColor: state.strokeColor, fillColor: state.fillColor, strokeWidth: state.strokeWidth, opacity, fontSize: state.fontSize, arrowHeadSize: state.arrowHeadSize }
    persistStyles(styles)
    return { opacity }
  }),
  setArrowHeadSize: (size) => set((state) => {
    const styles = { strokeColor: state.strokeColor, fillColor: state.fillColor, strokeWidth: state.strokeWidth, opacity: state.opacity, fontSize: state.fontSize, arrowHeadSize: size }
    persistStyles(styles)
    return { arrowHeadSize: size }
  }),
  setFontSize: (size) => set((state) => {
    const styles = { strokeColor: state.strokeColor, fillColor: state.fillColor, strokeWidth: state.strokeWidth, opacity: state.opacity, fontSize: size, arrowHeadSize: state.arrowHeadSize }
    persistStyles(styles)
    return { fontSize: size }
  }),
  setViewport: (viewport) => set({ viewport }),
  setActiveStrokePoints: (points) => set({ activeStrokePoints: points }),
  setActiveShapePreview: (preview) => set({ activeShapePreview: preview }),
  setActiveTextInput: (input) => set({ activeTextInput: input }),
  setEditingTextId: (id) => set({ editingTextId: id }),
  updateObjectStyles: (ids, styles) =>
    set((state) => ({
      _history: [...state._history.slice(-(MAX_HISTORY - 1)), structuredClone(state.objects)],
      _future: [],
      objects: state.objects.map((o) => {
        if (!ids.has(o.id)) return o
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updated: any = { ...o }
        if (styles.color !== undefined) updated.color = styles.color
        if (styles.opacity !== undefined) updated.opacity = styles.opacity
        if (styles.strokeWidth !== undefined && o.type !== 'text') updated.strokeWidth = styles.strokeWidth
        if (styles.fillColor !== undefined && (o.type === 'rectangle' || o.type === 'ellipse')) updated.fillColor = styles.fillColor
        return updated as SceneObject
      }),
    })),
  updateLineGeometry: (id, updates) =>
    set((state) => ({
      objects: state.objects.map((o) => {
        if (o.id !== id || o.type !== 'line') return o
        const line = { ...o, ...updates }
        if (line.cp1 && line.cp2) {
          return {
            ...line,
            pathData: generateRoughCurvedLine(line.x1, line.y1, line.cp1.x, line.cp1.y, line.cp2.x, line.cp2.y, line.x2, line.y2),
            boundingBox: boundingBoxFromCurvedArrow(line.x1, line.y1, line.cp1.x, line.cp1.y, line.cp2.x, line.cp2.y, line.x2, line.y2),
          }
        }
        return {
          ...line,
          pathData: generateRoughLine(line.x1, line.y1, line.x2, line.y2),
          boundingBox: boundingBoxFromLine(line.x1, line.y1, line.x2, line.y2),
        }
      }),
    })),

  updateArrowGeometry: (id, updates) =>
    set((state) => ({
      objects: state.objects.map((o) => {
        if (o.id !== id || o.type !== 'arrow') return o
        const arrow = { ...o, ...updates }
        const hl = arrow.arrowHeadSize ?? 16
        if (arrow.cp1 && arrow.cp2) {
          return {
            ...arrow,
            pathData: generateRoughCurvedArrow(arrow.x1, arrow.y1, arrow.cp1.x, arrow.cp1.y, arrow.cp2.x, arrow.cp2.y, arrow.x2, arrow.y2, hl),
            boundingBox: boundingBoxFromCurvedArrow(arrow.x1, arrow.y1, arrow.cp1.x, arrow.cp1.y, arrow.cp2.x, arrow.cp2.y, arrow.x2, arrow.y2),
          }
        }
        return {
          ...arrow,
          pathData: generateRoughArrow(arrow.x1, arrow.y1, arrow.x2, arrow.y2, hl),
          boundingBox: boundingBoxFromLine(arrow.x1, arrow.y1, arrow.x2, arrow.y2),
        }
      }),
    })),

  updateArrowHeadSize: (ids, size) =>
    set((state) => ({
      objects: state.objects.map((o) => {
        if (!ids.has(o.id) || o.type !== 'arrow') return o
        const arrow = { ...o, arrowHeadSize: size }
        if (arrow.cp1 && arrow.cp2) {
          return {
            ...arrow,
            pathData: generateRoughCurvedArrow(arrow.x1, arrow.y1, arrow.cp1.x, arrow.cp1.y, arrow.cp2.x, arrow.cp2.y, arrow.x2, arrow.y2, size),
          }
        }
        return {
          ...arrow,
          pathData: generateRoughArrow(arrow.x1, arrow.y1, arrow.x2, arrow.y2, size),
        }
      }),
    })),

  clearDrawing: () => set((state) => ({
    _history: [...state._history.slice(-(MAX_HISTORY - 1)), structuredClone(state.objects)],
    _future: [],
    objects: [],
    selectedIds: new Set(),
    viewport: { offsetX: 0, offsetY: 0, scale: 1 },
    activeTextInput: null,
    editingTextId: null,
  })),
}))

// Auto-save drawing to localStorage on objects/viewport changes
useStore.subscribe(
  (state, prev) => {
    if (state.objects !== prev.objects || state.viewport !== prev.viewport) {
      persistDrawing(state.objects, state.viewport)
    }
  },
)
