import { create } from 'zustand'
import type { SceneObject, Point, ViewportTransform, ToolType, ShapePreview, BoundingBox } from '../types/scene'
import { generateId } from '../utils/idGenerator'
import { applyResize } from '../utils/resize'

const STYLES_KEY = 'doodler-styles'

function loadStyles(): { strokeColor: string; fillColor: string; strokeWidth: number; opacity: number; fontSize: number } {
  try {
    const raw = localStorage.getItem(STYLES_KEY)
    if (raw) return { strokeColor: '#000000', fillColor: 'transparent', strokeWidth: 2, opacity: 1, fontSize: 24, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { strokeColor: '#000000', fillColor: 'transparent', strokeWidth: 2, opacity: 1, fontSize: 24 }
}

function persistStyles(state: { strokeColor: string; fillColor: string; strokeWidth: number; opacity: number; fontSize: number }) {
  try {
    localStorage.setItem(STYLES_KEY, JSON.stringify(state))
  } catch { /* ignore */ }
}

const savedStyles = loadStyles()

interface DoodlerState {
  // Scene
  objects: SceneObject[]
  selectedIds: Set<string>

  // Tool
  activeTool: ToolType
  strokeColor: string
  fillColor: string
  strokeWidth: number
  opacity: number
  fontSize: number

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
  addObject: (obj: SceneObject) => void
  deleteObjects: (ids: Set<string>) => void
  moveObjects: (ids: Set<string>, dx: number, dy: number) => void
  updateTextObject: (id: string, text: string, boundingBox: BoundingBox) => void
  duplicateObjects: (ids: Set<string>) => void
  bringForward: (ids: Set<string>) => void
  sendBackward: (ids: Set<string>) => void
  resizeObjects: (snapshots: Map<string, SceneObject>, anchor: Point, scaleX: number, scaleY: number) => void
  setSelectedIds: (ids: Set<string>) => void
  setMarqueeRect: (rect: BoundingBox | null) => void
  setActiveTool: (tool: ToolType) => void
  setStrokeColor: (color: string) => void
  setFillColor: (color: string) => void
  setStrokeWidth: (width: number) => void
  setOpacity: (opacity: number) => void
  setFontSize: (size: number) => void
  setViewport: (viewport: ViewportTransform) => void
  setActiveStrokePoints: (points: Point[] | null) => void
  setActiveShapePreview: (preview: ShapePreview | null) => void
  setActiveTextInput: (input: { x: number; y: number } | null) => void
  setEditingTextId: (id: string | null) => void
}

export const useStore = create<DoodlerState>((set) => ({
  objects: [],
  selectedIds: new Set(),
  activeTool: 'pen',
  strokeColor: savedStyles.strokeColor,
  fillColor: savedStyles.fillColor,
  strokeWidth: savedStyles.strokeWidth,
  opacity: savedStyles.opacity,
  fontSize: savedStyles.fontSize,
  viewport: { offsetX: 0, offsetY: 0, scale: 1 },
  activeStrokePoints: null,
  activeShapePreview: null,
  activeTextInput: null,
  editingTextId: null,
  marqueeRect: null,

  addObject: (obj) =>
    set((state) => ({ objects: [...state.objects, obj] })),

  deleteObjects: (ids) =>
    set((state) => ({
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
      return { objects: arr }
    }),

  sendBackward: (ids) =>
    set((state) => {
      const arr = [...state.objects]
      for (let i = 1; i < arr.length; i++) {
        if (ids.has(arr[i].id) && !ids.has(arr[i - 1].id)) {
          ;[arr[i], arr[i - 1]] = [arr[i - 1], arr[i]]
        }
      }
      return { objects: arr }
    }),

  resizeObjects: (snapshots, anchor, scaleX, scaleY) =>
    set((state) => ({
      objects: state.objects.map((o) => {
        const snap = snapshots.get(o.id)
        if (!snap) return o
        return applyResize(snap, anchor, scaleX, scaleY)
      }),
    })),

  setSelectedIds: (ids) => set({ selectedIds: ids }),
  setMarqueeRect: (rect) => set({ marqueeRect: rect }),
  setActiveTool: (tool) => set({ activeTool: tool, selectedIds: new Set(), activeTextInput: null, editingTextId: null }),
  setStrokeColor: (color) => set((state) => {
    const styles = { strokeColor: color, fillColor: state.fillColor, strokeWidth: state.strokeWidth, opacity: state.opacity, fontSize: state.fontSize }
    persistStyles(styles)
    return { strokeColor: color }
  }),
  setFillColor: (color) => set((state) => {
    const styles = { strokeColor: state.strokeColor, fillColor: color, strokeWidth: state.strokeWidth, opacity: state.opacity, fontSize: state.fontSize }
    persistStyles(styles)
    return { fillColor: color }
  }),
  setStrokeWidth: (width) => set((state) => {
    const styles = { strokeColor: state.strokeColor, fillColor: state.fillColor, strokeWidth: width, opacity: state.opacity, fontSize: state.fontSize }
    persistStyles(styles)
    return { strokeWidth: width }
  }),
  setOpacity: (opacity) => set((state) => {
    const styles = { strokeColor: state.strokeColor, fillColor: state.fillColor, strokeWidth: state.strokeWidth, opacity, fontSize: state.fontSize }
    persistStyles(styles)
    return { opacity }
  }),
  setFontSize: (size) => set((state) => {
    const styles = { strokeColor: state.strokeColor, fillColor: state.fillColor, strokeWidth: state.strokeWidth, opacity: state.opacity, fontSize: size }
    persistStyles(styles)
    return { fontSize: size }
  }),
  setViewport: (viewport) => set({ viewport }),
  setActiveStrokePoints: (points) => set({ activeStrokePoints: points }),
  setActiveShapePreview: (preview) => set({ activeShapePreview: preview }),
  setActiveTextInput: (input) => set({ activeTextInput: input }),
  setEditingTextId: (id) => set({ editingTextId: id }),
}))
