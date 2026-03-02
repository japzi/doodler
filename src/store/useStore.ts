import { create } from 'zustand'
import type { SceneObject, Point, ViewportTransform, ToolType, ShapePreview, BoundingBox } from '../types/scene'

interface DoodlerState {
  // Scene
  objects: SceneObject[]
  selectedIds: Set<string>

  // Tool
  activeTool: ToolType
  strokeColor: string

  // Viewport
  viewport: ViewportTransform

  // In-progress drawing
  activeStrokePoints: Point[] | null
  activeShapePreview: ShapePreview | null

  // Text editing
  activeTextInput: { x: number; y: number } | null
  editingTextId: string | null

  // Actions
  addObject: (obj: SceneObject) => void
  deleteObjects: (ids: Set<string>) => void
  moveObjects: (ids: Set<string>, dx: number, dy: number) => void
  updateTextObject: (id: string, text: string, boundingBox: BoundingBox) => void
  setSelectedIds: (ids: Set<string>) => void
  setActiveTool: (tool: ToolType) => void
  setStrokeColor: (color: string) => void
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
  strokeColor: '#000000',
  viewport: { offsetX: 0, offsetY: 0, scale: 1 },
  activeStrokePoints: null,
  activeShapePreview: null,
  activeTextInput: null,
  editingTextId: null,

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

  setSelectedIds: (ids) => set({ selectedIds: ids }),
  setActiveTool: (tool) => set({ activeTool: tool, selectedIds: new Set(), activeTextInput: null, editingTextId: null }),
  setStrokeColor: (color) => set({ strokeColor: color }),
  setViewport: (viewport) => set({ viewport }),
  setActiveStrokePoints: (points) => set({ activeStrokePoints: points }),
  setActiveShapePreview: (preview) => set({ activeShapePreview: preview }),
  setActiveTextInput: (input) => set({ activeTextInput: input }),
  setEditingTextId: (id) => set({ editingTextId: id }),
}))
