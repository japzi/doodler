import { create } from 'zustand'
import JSZip from 'jszip'
import type { SceneObject, GroupObject, ImageObject, TextObject, Point, ViewportTransform, ToolType, ShapePreview, BoundingBox } from '../types/scene'
import { generateId } from '../utils/idGenerator'
import { applyResize } from '../utils/resize'
import { getWorldBounds, boundingBoxFromLine, boundingBoxFromCurvedArrow, boundingBoxFromPolygon } from '../utils/boundingBox'
import { generateRoughLine, generateRoughCurvedLine, generateRoughArrow, generateRoughCurvedArrow, generateRoughPolygon } from '../rendering/roughPath'
import { generateStrokePathData } from '../rendering/sketchyPath'
import { DEFAULT_FONT_FAMILY } from '../fonts/fontRegistry'
import { measureTextBounds } from '../utils/measureText'

const STYLES_KEY = 'lumidraw-styles'
const DRAWING_KEY = 'lumidraw-drawing'

function loadDrawing(): { objects: SceneObject[]; viewport: ViewportTransform; projectName?: string } | null {
  try {
    const raw = localStorage.getItem(DRAWING_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (Array.isArray(data.objects) && data.viewport) return data
    }
  } catch { /* ignore */ }
  return null
}

function persistDrawing(objects: SceneObject[], viewport: ViewportTransform, projectName: string) {
  try {
    localStorage.setItem(DRAWING_KEY, JSON.stringify({ objects, viewport, projectName }))
  } catch { /* ignore */ }
}

function collectImages(objs: SceneObject[]): ImageObject[] {
  const images: ImageObject[] = []
  for (const obj of objs) {
    if (obj.type === 'image') images.push(obj)
    else if (obj.type === 'group') images.push(...collectImages(obj.children))
  }
  return images
}

function dataUrlToBlob(dataUrl: string): { blob: Uint8Array; ext: string } {
  const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
  if (!match) return { blob: new Uint8Array(), ext: 'png' }
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1]
  const binary = atob(match[2])
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return { blob: bytes, ext }
}

function replaceImageSrcs(objs: SceneObject[], mapping: Map<string, string>): SceneObject[] {
  return objs.map((obj) => {
    if (obj.type === 'image' && mapping.has(obj.id)) {
      return { ...obj, src: mapping.get(obj.id)! }
    }
    if (obj.type === 'group') {
      return { ...obj, children: replaceImageSrcs(obj.children, mapping) }
    }
    return obj
  })
}

function restoreImageSrcs(objs: SceneObject[], mapping: Map<string, string>): SceneObject[] {
  return objs.map((obj) => {
    if (obj.type === 'image' && mapping.has(obj.src)) {
      return { ...obj, src: mapping.get(obj.src)! }
    }
    if (obj.type === 'group') {
      return { ...obj, children: restoreImageSrcs(obj.children, mapping) }
    }
    return obj
  })
}

export async function exportProject(name?: string) {
  const state = useStore.getState()
  const { objects, viewport } = state
  const cleanName = name ? name.replace(/\.lumi$/i, '') : undefined
  const projectName = cleanName ?? state.projectName

  if (cleanName) {
    useStore.setState({ projectName: cleanName })
  }

  const zip = new JSZip()
  const images = collectImages(objects)
  const srcMapping = new Map<string, string>()

  for (const img of images) {
    const { blob, ext } = dataUrlToBlob(img.src)
    const filename = `images/${img.id}.${ext}`
    zip.file(filename, blob)
    srcMapping.set(img.id, filename)
  }

  const exportObjects = images.length > 0 ? replaceImageSrcs(objects, srcMapping) : objects
  zip.file('project.json', JSON.stringify({ version: 1, projectName, objects: exportObjects, viewport }, null, 2))

  const content = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(content)
  const a = document.createElement('a')
  a.href = url
  a.download = `${projectName}.lumi`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function filenameWithoutExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

export async function importProject(file: File): Promise<void> {
  const buf = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(buf)
  const projectFile = zip.file('project.json')
  if (!projectFile) throw new Error('Invalid .lumi file: no project.json')
  const jsonStr = await projectFile.async('string')
  const data = JSON.parse(jsonStr)
  if (!data.version || !Array.isArray(data.objects)) throw new Error('Invalid file format')

  // Restore image src fields from ZIP image files
  const srcMapping = new Map<string, string>()
  const imageFiles = Object.keys(zip.files).filter((f) => f.startsWith('images/') && !zip.files[f].dir)
  for (const path of imageFiles) {
    const imgData = await zip.file(path)!.async('uint8array')
    const ext = path.split('.').pop() ?? 'png'
    const mimeExt = ext === 'jpg' ? 'jpeg' : ext
    let binary = ''
    for (let i = 0; i < imgData.length; i++) binary += String.fromCharCode(imgData[i])
    const base64 = btoa(binary)
    const dataUrl = `data:image/${mimeExt};base64,${base64}`
    srcMapping.set(path, dataUrl)
  }

  const objects = restoreImageSrcs(data.objects, srcMapping)
  useStore.setState({
    objects,
    viewport: data.viewport ?? { offsetX: 0, offsetY: 0, scale: 1 },
    projectName: data.projectName ?? filenameWithoutExtension(file.name),
    selectedIds: new Set(),
    activeTextInput: null,
    editingTextId: null,
  })
}

function loadStyles(): { strokeColor: string; fillColor: string; strokeWidth: number; opacity: number; fontSize: number; fontFamily: string; arrowHeadSize: number; shadowEnabled: boolean; shadowOffset: number; shadowAngle: number; bold: boolean; italic: boolean; underline: boolean } {
  try {
    const raw = localStorage.getItem(STYLES_KEY)
    if (raw) return { strokeColor: '#000000', fillColor: 'transparent', strokeWidth: 2, opacity: 1, fontSize: 24, fontFamily: DEFAULT_FONT_FAMILY, arrowHeadSize: 16, shadowEnabled: false, shadowOffset: 8, shadowAngle: 135, bold: false, italic: false, underline: false, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { strokeColor: '#000000', fillColor: 'transparent', strokeWidth: 2, opacity: 1, fontSize: 24, fontFamily: DEFAULT_FONT_FAMILY, arrowHeadSize: 16, shadowEnabled: false, shadowOffset: 8, shadowAngle: 135, bold: false, italic: false, underline: false }
}

function persistStyles(state: { strokeColor: string; fillColor: string; strokeWidth: number; opacity: number; fontSize: number; fontFamily: string; arrowHeadSize: number; shadowEnabled: boolean; shadowOffset: number; shadowAngle: number; bold: boolean; italic: boolean; underline: boolean }) {
  try {
    localStorage.setItem(STYLES_KEY, JSON.stringify(state))
  } catch { /* ignore */ }
}

const savedStyles = loadStyles()
const savedDrawing = loadDrawing()

const MAX_HISTORY = 50

interface LumiDrawState {
  // Project
  projectName: string

  // Scene
  objects: SceneObject[]
  selectedIds: Set<string>

  // History (undo/redo)
  _history: SceneObject[][]
  _future: SceneObject[][]

  // Clipboard
  _clipboard: SceneObject[]
  _pasteCount: number

  // Tool
  activeTool: ToolType
  strokeColor: string
  fillColor: string
  strokeWidth: number
  opacity: number
  fontSize: number
  fontFamily: string
  bold: boolean
  italic: boolean
  underline: boolean
  arrowHeadSize: number
  shadowEnabled: boolean
  shadowOffset: number
  shadowAngle: number

  // Viewport
  viewport: ViewportTransform

  // In-progress drawing
  activeStrokePoints: Point[] | null
  activeShapePreview: ShapePreview | null

  // Text editing
  activeTextInput: { x: number; y: number } | null
  editingTextId: string | null

  // View options
  showGrid: boolean

  // Polygon drawing
  activePolygonPoints: Point[] | null
  selectedPolygonVertex: number | null

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
  copyObjects: (ids: Set<string>) => void
  cutObjects: (ids: Set<string>) => void
  pasteObjects: () => void
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
  setFontFamily: (family: string) => void
  setViewport: (viewport: ViewportTransform) => void
  setActiveStrokePoints: (points: Point[] | null) => void
  setActiveShapePreview: (preview: ShapePreview | null) => void
  setActiveTextInput: (input: { x: number; y: number } | null) => void
  setEditingTextId: (id: string | null) => void
  setBold: (bold: boolean) => void
  setItalic: (italic: boolean) => void
  setUnderline: (underline: boolean) => void
  setShadowEnabled: (enabled: boolean) => void
  setShadowOffset: (offset: number) => void
  setShadowAngle: (angle: number) => void
  setProjectName: (name: string) => void
  toggleGrid: () => void
  clearDrawing: () => void
  updateObjectStyles: (ids: Set<string>, styles: { color?: string; fillColor?: string; strokeWidth?: number; opacity?: number; shadow?: { offset: number; angle?: number } | null; fontFamily?: string; fontSize?: number; bold?: boolean; italic?: boolean; underline?: boolean }) => void
  updateLineGeometry: (id: string, updates: Partial<{ x1: number; y1: number; x2: number; y2: number; cp1: { x: number; y: number }; cp2: { x: number; y: number } }>) => void
  updateArrowGeometry: (id: string, updates: Partial<{ x1: number; y1: number; x2: number; y2: number; cp1: { x: number; y: number }; cp2: { x: number; y: number } }>) => void
  updateArrowHeadSize: (ids: Set<string>, size: number) => void
  groupObjects: (ids: Set<string>) => void
  rotateObjects: (angleMap: Map<string, number>) => void
  ungroupObjects: (ids: Set<string>) => void
  setActivePolygonPoints: (points: Point[] | null) => void
  setSelectedPolygonVertex: (index: number | null) => void
  updatePolygonGeometry: (id: string, points: Point[]) => void
  toggleLockObjects: (ids: Set<string>) => void
}

export const useStore = create<LumiDrawState>((set) => ({
  projectName: savedDrawing?.projectName ?? 'Untitled',
  objects: savedDrawing?.objects ?? [],
  selectedIds: new Set(),
  activeTool: 'pen',
  strokeColor: savedStyles.strokeColor,
  fillColor: savedStyles.fillColor,
  strokeWidth: savedStyles.strokeWidth,
  opacity: savedStyles.opacity,
  fontSize: savedStyles.fontSize,
  fontFamily: savedStyles.fontFamily,
  bold: savedStyles.bold,
  italic: savedStyles.italic,
  underline: savedStyles.underline,
  arrowHeadSize: savedStyles.arrowHeadSize,
  shadowEnabled: savedStyles.shadowEnabled,
  shadowOffset: savedStyles.shadowOffset,
  shadowAngle: savedStyles.shadowAngle,
  viewport: savedDrawing?.viewport ?? { offsetX: 0, offsetY: 0, scale: 1 },
  activeStrokePoints: null,
  activeShapePreview: null,
  activeTextInput: null,
  editingTextId: null,
  showGrid: false,
  activePolygonPoints: null,
  selectedPolygonVertex: null,
  marqueeRect: null,
  _history: [],
  _future: [],
  _clipboard: [],
  _pasteCount: 0,

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
    set((state) => {
      const unlocked = new Set([...ids].filter((id) => {
        const obj = state.objects.find((o) => o.id === id)
        return obj && !obj.locked
      }))
      if (unlocked.size === 0) return state
      return {
        _history: [...state._history.slice(-(MAX_HISTORY - 1)), structuredClone(state.objects)],
        _future: [],
        objects: state.objects.filter((o) => !unlocked.has(o.id)),
        selectedIds: new Set(),
      }
    }),

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
          if (clone.type === 'group') {
            clone.children = clone.children.map((child: SceneObject) => ({
              ...child,
              id: generateId(),
            }))
          }
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

  copyObjects: (ids) =>
    set((state) => {
      const clones: SceneObject[] = []
      for (const obj of state.objects) {
        if (ids.has(obj.id)) {
          clones.push(structuredClone(obj))
        }
      }
      return { _clipboard: clones, _pasteCount: 0 }
    }),

  cutObjects: (ids) =>
    set((state) => {
      const clones: SceneObject[] = []
      for (const obj of state.objects) {
        if (ids.has(obj.id)) {
          clones.push(structuredClone(obj))
        }
      }
      return {
        _clipboard: clones,
        _pasteCount: 0,
        _history: [...state._history.slice(-(MAX_HISTORY - 1)), structuredClone(state.objects)],
        _future: [],
        objects: state.objects.filter((o) => !ids.has(o.id)),
        selectedIds: new Set(),
      }
    }),

  pasteObjects: () =>
    set((state) => {
      if (state._clipboard.length === 0) return state
      const offset = (state._pasteCount + 1) * 20
      const clones: SceneObject[] = state._clipboard.map((obj) => {
        const clone = structuredClone(obj)
        clone.id = generateId()
        clone.position = { x: clone.position.x + offset, y: clone.position.y + offset }
        if (clone.type === 'group') {
          clone.children = clone.children.map((child: SceneObject) => ({
            ...child,
            id: generateId(),
          }))
        }
        return clone
      })
      return {
        _pasteCount: state._pasteCount + 1,
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

  setSelectedIds: (ids) => set({ selectedIds: ids, selectedPolygonVertex: null }),
  setMarqueeRect: (rect) => set({ marqueeRect: rect }),
  setActiveTool: (tool) => set({ activeTool: tool, selectedIds: new Set(), activeTextInput: null, editingTextId: null, activePolygonPoints: null, selectedPolygonVertex: null }),
  setStrokeColor: (color) => set((state) => {
    const styles = { strokeColor: color, fillColor: state.fillColor, strokeWidth: state.strokeWidth, opacity: state.opacity, fontSize: state.fontSize, fontFamily: state.fontFamily, arrowHeadSize: state.arrowHeadSize, shadowEnabled: state.shadowEnabled, shadowOffset: state.shadowOffset, shadowAngle: state.shadowAngle, bold: state.bold, italic: state.italic, underline: state.underline }
    persistStyles(styles)
    return { strokeColor: color }
  }),
  setFillColor: (color) => set((state) => {
    const styles = { strokeColor: state.strokeColor, fillColor: color, strokeWidth: state.strokeWidth, opacity: state.opacity, fontSize: state.fontSize, fontFamily: state.fontFamily, arrowHeadSize: state.arrowHeadSize, shadowEnabled: state.shadowEnabled, shadowOffset: state.shadowOffset, shadowAngle: state.shadowAngle, bold: state.bold, italic: state.italic, underline: state.underline }
    persistStyles(styles)
    return { fillColor: color }
  }),
  setStrokeWidth: (width) => set((state) => {
    const styles = { strokeColor: state.strokeColor, fillColor: state.fillColor, strokeWidth: width, opacity: state.opacity, fontSize: state.fontSize, fontFamily: state.fontFamily, arrowHeadSize: state.arrowHeadSize, shadowEnabled: state.shadowEnabled, shadowOffset: state.shadowOffset, shadowAngle: state.shadowAngle, bold: state.bold, italic: state.italic, underline: state.underline }
    persistStyles(styles)
    return { strokeWidth: width }
  }),
  setOpacity: (opacity) => set((state) => {
    const styles = { strokeColor: state.strokeColor, fillColor: state.fillColor, strokeWidth: state.strokeWidth, opacity, fontSize: state.fontSize, fontFamily: state.fontFamily, arrowHeadSize: state.arrowHeadSize, shadowEnabled: state.shadowEnabled, shadowOffset: state.shadowOffset, shadowAngle: state.shadowAngle, bold: state.bold, italic: state.italic, underline: state.underline }
    persistStyles(styles)
    return { opacity }
  }),
  setArrowHeadSize: (size) => set((state) => {
    const styles = { strokeColor: state.strokeColor, fillColor: state.fillColor, strokeWidth: state.strokeWidth, opacity: state.opacity, fontSize: state.fontSize, fontFamily: state.fontFamily, arrowHeadSize: size, shadowEnabled: state.shadowEnabled, shadowOffset: state.shadowOffset, shadowAngle: state.shadowAngle, bold: state.bold, italic: state.italic, underline: state.underline }
    persistStyles(styles)
    return { arrowHeadSize: size }
  }),
  setFontSize: (size) => set((state) => {
    const styles = { strokeColor: state.strokeColor, fillColor: state.fillColor, strokeWidth: state.strokeWidth, opacity: state.opacity, fontSize: size, fontFamily: state.fontFamily, arrowHeadSize: state.arrowHeadSize, shadowEnabled: state.shadowEnabled, shadowOffset: state.shadowOffset, shadowAngle: state.shadowAngle, bold: state.bold, italic: state.italic, underline: state.underline }
    persistStyles(styles)
    return { fontSize: size }
  }),
  setFontFamily: (family) => set((state) => {
    const styles = { strokeColor: state.strokeColor, fillColor: state.fillColor, strokeWidth: state.strokeWidth, opacity: state.opacity, fontSize: state.fontSize, fontFamily: family, arrowHeadSize: state.arrowHeadSize, shadowEnabled: state.shadowEnabled, shadowOffset: state.shadowOffset, shadowAngle: state.shadowAngle, bold: state.bold, italic: state.italic, underline: state.underline }
    persistStyles(styles)
    return { fontFamily: family }
  }),
  setBold: (bold) => set((state) => {
    const styles = { strokeColor: state.strokeColor, fillColor: state.fillColor, strokeWidth: state.strokeWidth, opacity: state.opacity, fontSize: state.fontSize, fontFamily: state.fontFamily, arrowHeadSize: state.arrowHeadSize, shadowEnabled: state.shadowEnabled, shadowOffset: state.shadowOffset, shadowAngle: state.shadowAngle, bold, italic: state.italic, underline: state.underline }
    persistStyles(styles)
    return { bold }
  }),
  setItalic: (italic) => set((state) => {
    const styles = { strokeColor: state.strokeColor, fillColor: state.fillColor, strokeWidth: state.strokeWidth, opacity: state.opacity, fontSize: state.fontSize, fontFamily: state.fontFamily, arrowHeadSize: state.arrowHeadSize, shadowEnabled: state.shadowEnabled, shadowOffset: state.shadowOffset, shadowAngle: state.shadowAngle, bold: state.bold, italic, underline: state.underline }
    persistStyles(styles)
    return { italic }
  }),
  setUnderline: (underline) => set((state) => {
    const styles = { strokeColor: state.strokeColor, fillColor: state.fillColor, strokeWidth: state.strokeWidth, opacity: state.opacity, fontSize: state.fontSize, fontFamily: state.fontFamily, arrowHeadSize: state.arrowHeadSize, shadowEnabled: state.shadowEnabled, shadowOffset: state.shadowOffset, shadowAngle: state.shadowAngle, bold: state.bold, italic: state.italic, underline }
    persistStyles(styles)
    return { underline }
  }),
  setShadowEnabled: (enabled) => set((state) => {
    const styles = { strokeColor: state.strokeColor, fillColor: state.fillColor, strokeWidth: state.strokeWidth, opacity: state.opacity, fontSize: state.fontSize, fontFamily: state.fontFamily, arrowHeadSize: state.arrowHeadSize, shadowEnabled: enabled, shadowOffset: state.shadowOffset, shadowAngle: state.shadowAngle, bold: state.bold, italic: state.italic, underline: state.underline }
    persistStyles(styles)
    return { shadowEnabled: enabled }
  }),
  setShadowOffset: (offset) => set((state) => {
    const styles = { strokeColor: state.strokeColor, fillColor: state.fillColor, strokeWidth: state.strokeWidth, opacity: state.opacity, fontSize: state.fontSize, fontFamily: state.fontFamily, arrowHeadSize: state.arrowHeadSize, shadowEnabled: state.shadowEnabled, shadowOffset: offset, shadowAngle: state.shadowAngle, bold: state.bold, italic: state.italic, underline: state.underline }
    persistStyles(styles)
    return { shadowOffset: offset }
  }),
  setShadowAngle: (angle) => set((state) => {
    const styles = { strokeColor: state.strokeColor, fillColor: state.fillColor, strokeWidth: state.strokeWidth, opacity: state.opacity, fontSize: state.fontSize, fontFamily: state.fontFamily, arrowHeadSize: state.arrowHeadSize, shadowEnabled: state.shadowEnabled, shadowOffset: state.shadowOffset, shadowAngle: angle, bold: state.bold, italic: state.italic, underline: state.underline }
    persistStyles(styles)
    return { shadowAngle: angle }
  }),
  setViewport: (viewport) => set({ viewport }),
  setActiveStrokePoints: (points) => set({ activeStrokePoints: points }),
  setActiveShapePreview: (preview) => set({ activeShapePreview: preview }),
  setActiveTextInput: (input) => set({ activeTextInput: input }),
  setEditingTextId: (id) => set({ editingTextId: id }),
  setProjectName: (name) => set({ projectName: name }),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  updateObjectStyles: (ids, styles) =>
    set((state) => {
      const applyStyles = (o: SceneObject): SceneObject => {
        if (o.type === 'group') {
          return { ...o, children: o.children.map(applyStyles) }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updated: any = { ...o }
        if (styles.color !== undefined) updated.color = styles.color
        if (styles.opacity !== undefined) updated.opacity = styles.opacity
        if (styles.strokeWidth !== undefined && o.type !== 'text') {
          updated.strokeWidth = styles.strokeWidth
          if (o.type === 'pen') {
            updated.pathData = generateStrokePathData(o.points, styles.strokeWidth * 3)
          }
        }
        if (styles.fillColor !== undefined && (o.type === 'rectangle' || o.type === 'ellipse' || o.type === 'cloud' || o.type === 'polygon')) updated.fillColor = styles.fillColor
        if (styles.shadow !== undefined && (o.type === 'rectangle' || o.type === 'ellipse' || o.type === 'cloud' || o.type === 'polygon')) {
          if (styles.shadow === null) {
            delete updated.shadow
          } else {
            updated.shadow = styles.shadow
          }
        }
        if (o.type === 'text') {
          const textObj = o as TextObject
          let needsRecalc = false
          if (styles.fontFamily !== undefined) { updated.fontFamily = styles.fontFamily; needsRecalc = true }
          if (styles.fontSize !== undefined) { updated.fontSize = styles.fontSize; needsRecalc = true }
          if (styles.bold !== undefined) { updated.bold = styles.bold; needsRecalc = true }
          if (styles.italic !== undefined) { updated.italic = styles.italic; needsRecalc = true }
          if (styles.underline !== undefined) { updated.underline = styles.underline }
          if (needsRecalc) {
            updated.boundingBox = measureTextBounds(textObj.text, updated.fontSize, updated.fontFamily ?? DEFAULT_FONT_FAMILY, updated.bold ?? false, updated.italic ?? false)
          }
        }
        return updated as SceneObject
      }
      return {
        _history: [...state._history.slice(-(MAX_HISTORY - 1)), structuredClone(state.objects)],
        _future: [],
        objects: state.objects.map((o) => {
          if (!ids.has(o.id) || o.locked) return o
          return applyStyles(o)
        }),
      }
    }),
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

  groupObjects: (ids) =>
    set((state) => {
      const selected = state.objects.filter((o) => ids.has(o.id))
      if (selected.length < 2) return state

      // Compute combined world bounding box
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const obj of selected) {
        const bb = obj.boundingBox
        const ox = obj.position.x
        const oy = obj.position.y
        minX = Math.min(minX, bb.x + ox)
        minY = Math.min(minY, bb.y + oy)
        maxX = Math.max(maxX, bb.x + bb.width + ox)
        maxY = Math.max(maxY, bb.y + bb.height + oy)
      }

      const groupPos = { x: minX, y: minY }

      // Adjust child positions to be relative to group origin
      const children: SceneObject[] = selected.map((obj) => ({
        ...obj,
        position: { x: obj.position.x - groupPos.x, y: obj.position.y - groupPos.y },
      }))

      const group: GroupObject = {
        type: 'group',
        id: generateId(),
        children,
        position: groupPos,
        boundingBox: { x: 0, y: 0, width: maxX - minX, height: maxY - minY },
      }

      // Replace originals preserving z-order: insert group at position of first selected object
      const idSet = ids
      const newObjects: SceneObject[] = []
      let groupInserted = false
      for (const obj of state.objects) {
        if (idSet.has(obj.id)) {
          if (!groupInserted) {
            newObjects.push(group)
            groupInserted = true
          }
        } else {
          newObjects.push(obj)
        }
      }

      return {
        _history: [...state._history.slice(-(MAX_HISTORY - 1)), structuredClone(state.objects)],
        _future: [],
        objects: newObjects,
        selectedIds: new Set([group.id]),
      }
    }),

  rotateObjects: (angleMap) =>
    set((state) => ({
      objects: state.objects.map((o) => {
        if (angleMap.has(o.id)) {
          return { ...o, rotation: angleMap.get(o.id)! }
        }
        return o
      }),
    })),

  ungroupObjects: (ids) =>
    set((state) => {
      const groups = state.objects.filter((o) => ids.has(o.id) && o.type === 'group') as GroupObject[]
      if (groups.length === 0) return state

      const groupIds = new Set(groups.map((g) => g.id))
      const ungroupedChildIds: string[] = []

      const newObjects: SceneObject[] = []
      for (const obj of state.objects) {
        if (groupIds.has(obj.id) && obj.type === 'group') {
          // Replace group with its children, adjusting positions back to world coords
          const groupRotation = obj.rotation ?? 0
          for (const child of obj.children) {
            const restored: SceneObject = {
              ...child,
              position: { x: child.position.x + obj.position.x, y: child.position.y + obj.position.y },
              rotation: groupRotation !== 0 ? ((child.rotation ?? 0) + groupRotation) : child.rotation,
            }
            newObjects.push(restored)
            ungroupedChildIds.push(child.id)
          }
        } else {
          newObjects.push(obj)
        }
      }

      return {
        _history: [...state._history.slice(-(MAX_HISTORY - 1)), structuredClone(state.objects)],
        _future: [],
        objects: newObjects,
        selectedIds: new Set(ungroupedChildIds),
      }
    }),

  clearDrawing: () => set((state) => ({
    _history: [...state._history.slice(-(MAX_HISTORY - 1)), structuredClone(state.objects)],
    _future: [],
    objects: [],
    selectedIds: new Set(),
    viewport: { offsetX: 0, offsetY: 0, scale: 1 },
    activeTextInput: null,
    editingTextId: null,
    activePolygonPoints: null,
    selectedPolygonVertex: null,
    projectName: 'Untitled',
  })),

  setActivePolygonPoints: (points) => set({ activePolygonPoints: points }),
  setSelectedPolygonVertex: (index) => set({ selectedPolygonVertex: index }),

  updatePolygonGeometry: (id, points) =>
    set((state) => ({
      objects: state.objects.map((o) => {
        if (o.id !== id || o.type !== 'polygon') return o
        const bbox = boundingBoxFromPolygon(points)
        const normalizedPoints = points.map((p) => ({ x: p.x - bbox.x, y: p.y - bbox.y }))
        const normalizedBbox = { x: 0, y: 0, width: bbox.width, height: bbox.height }
        return {
          ...o,
          points: normalizedPoints,
          position: { x: bbox.x, y: bbox.y },
          pathData: generateRoughPolygon(normalizedPoints),
          boundingBox: normalizedBbox,
        }
      }),
    })),

  toggleLockObjects: (ids) =>
    set((state) => {
      const targets = state.objects.filter((o) => ids.has(o.id))
      if (targets.length === 0) return state
      // If any are unlocked, lock all; if all locked, unlock all
      const allLocked = targets.every((o) => o.locked)
      const newLocked = !allLocked
      return {
        _history: [...state._history.slice(-(MAX_HISTORY - 1)), structuredClone(state.objects)],
        _future: [],
        objects: state.objects.map((o) =>
          ids.has(o.id) ? { ...o, locked: newLocked ? true : undefined } : o
        ),
      }
    }),
}))

// Auto-save drawing to localStorage on objects/viewport/projectName changes
useStore.subscribe(
  (state, prev) => {
    if (state.objects !== prev.objects || state.viewport !== prev.viewport || state.projectName !== prev.projectName) {
      persistDrawing(state.objects, state.viewport, state.projectName)
    }
  },
)
