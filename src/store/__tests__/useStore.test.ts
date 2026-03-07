import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock localStorage before store import
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

// Mock nanoid for predictable IDs
let idCounter = 0
vi.mock('nanoid', () => ({
  nanoid: () => `id-${++idCounter}`,
}))

// Mock rough path generation (depends on canvas/DOM)
vi.mock('../../rendering/roughPath', () => ({
  generateRoughRect: () => 'mock-path',
  generateRoughEllipse: () => 'mock-path',
  generateRoughLine: () => 'mock-path',
  generateRoughCurvedLine: () => 'mock-path',
  generateRoughArrow: () => 'mock-path',
  generateRoughCurvedArrow: () => 'mock-path',
}))

// Mock sketchy path
vi.mock('../../rendering/sketchyPath', () => ({
  generateStrokePathData: () => 'mock-stroke-path',
}))

// Mock measureText (depends on DOM)
vi.mock('../../utils/measureText', () => ({
  measureTextBounds: () => ({ x: 0, y: 0, width: 100, height: 20 }),
}))

// Mock fontRegistry
vi.mock('../../fonts/fontRegistry', () => ({
  DEFAULT_FONT_FAMILY: 'sans-serif',
}))

import { useStore, importProject } from '../useStore'
import JSZip from 'jszip'
import type { RectangleShape, ImageObject, GroupObject } from '../../types/scene'

function makeRect(id: string, x = 0, y = 0): RectangleShape {
  return {
    type: 'rectangle',
    id,
    x: 0, y: 0, width: 100, height: 50,
    color: '#000',
    pathData: 'mock-path',
    position: { x, y },
    boundingBox: { x: 0, y: 0, width: 100, height: 50 },
  }
}

function resetStore() {
  useStore.setState({
    objects: [],
    selectedIds: new Set(),
    projectName: 'Untitled',
    _history: [],
    _future: [],
    _clipboard: [],
    _pasteCount: 0,
  })
  idCounter = 0
}

describe('useStore', () => {
  beforeEach(() => {
    resetStore()
  })

  describe('undo/redo', () => {
    it('undoes addObject and redo restores it', () => {
      const rect = makeRect('r1')
      useStore.getState().addObject(rect)
      expect(useStore.getState().objects).toHaveLength(1)

      useStore.getState().undo()
      expect(useStore.getState().objects).toHaveLength(0)

      useStore.getState().redo()
      expect(useStore.getState().objects).toHaveLength(1)
      expect(useStore.getState().objects[0].id).toBe('r1')
    })

    it('undo clears selection', () => {
      const rect = makeRect('r1')
      useStore.getState().addObject(rect)
      useStore.setState({ selectedIds: new Set(['r1']) })

      useStore.getState().undo()
      expect(useStore.getState().selectedIds.size).toBe(0)
    })

    it('does nothing when no history', () => {
      useStore.getState().undo()
      expect(useStore.getState().objects).toHaveLength(0)
    })

    it('does nothing when no future', () => {
      useStore.getState().redo()
      expect(useStore.getState().objects).toHaveLength(0)
    })
  })

  describe('deleteObjects', () => {
    it('removes objects by ID', () => {
      const r1 = makeRect('r1')
      const r2 = makeRect('r2', 100)
      useStore.getState().addObject(r1)
      useStore.getState().addObject(r2)

      useStore.getState().deleteObjects(new Set(['r1']))
      const state = useStore.getState()
      expect(state.objects).toHaveLength(1)
      expect(state.objects[0].id).toBe('r2')
    })

    it('clears selection after delete', () => {
      const r1 = makeRect('r1')
      useStore.getState().addObject(r1)
      useStore.setState({ selectedIds: new Set(['r1']) })

      useStore.getState().deleteObjects(new Set(['r1']))
      expect(useStore.getState().selectedIds.size).toBe(0)
    })

    it('pushes history', () => {
      const r1 = makeRect('r1')
      useStore.getState().addObject(r1)

      useStore.getState().deleteObjects(new Set(['r1']))
      // History: [] (from addObject) + [r1] (from deleteObjects)
      expect(useStore.getState()._history.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('duplicateObjects', () => {
    it('creates a clone with new ID and +10px offset', () => {
      const r1 = makeRect('r1', 50, 50)
      useStore.getState().addObject(r1)

      useStore.getState().duplicateObjects(new Set(['r1']))
      const state = useStore.getState()
      expect(state.objects).toHaveLength(2)

      const clone = state.objects[1]
      expect(clone.id).not.toBe('r1')
      expect(clone.position.x).toBe(60)
      expect(clone.position.y).toBe(60)
    })

    it('selects the cloned objects', () => {
      const r1 = makeRect('r1')
      useStore.getState().addObject(r1)

      useStore.getState().duplicateObjects(new Set(['r1']))
      const state = useStore.getState()
      const cloneId = state.objects[1].id
      expect(state.selectedIds.has(cloneId)).toBe(true)
    })

    it('generates new IDs for group children', () => {
      const child = makeRect('c1')
      const group: GroupObject = {
        type: 'group',
        id: 'g1',
        children: [child],
        position: { x: 0, y: 0 },
        boundingBox: { x: 0, y: 0, width: 100, height: 50 },
      }
      useStore.getState().addObject(group)
      useStore.getState().duplicateObjects(new Set(['g1']))

      const state = useStore.getState()
      const clonedGroup = state.objects[1] as GroupObject
      expect(clonedGroup.children[0].id).not.toBe('c1')
    })
  })

  describe('copy/cut/paste', () => {
    it('copy does not push history', () => {
      const r1 = makeRect('r1')
      useStore.getState().addObject(r1)
      const historyLenBefore = useStore.getState()._history.length

      useStore.getState().copyObjects(new Set(['r1']))
      expect(useStore.getState()._history.length).toBe(historyLenBefore)
    })

    it('cut pushes history and removes originals', () => {
      const r1 = makeRect('r1')
      useStore.getState().addObject(r1)
      const historyLenBefore = useStore.getState()._history.length

      useStore.getState().cutObjects(new Set(['r1']))
      const state = useStore.getState()
      expect(state.objects).toHaveLength(0)
      expect(state._history.length).toBeGreaterThan(historyLenBefore)
    })

    it('paste offsets +20px with incrementing pasteCount', () => {
      const r1 = makeRect('r1', 10, 10)
      useStore.getState().addObject(r1)
      useStore.getState().copyObjects(new Set(['r1']))

      useStore.getState().pasteObjects()
      let state = useStore.getState()
      let pasted = state.objects[state.objects.length - 1]
      expect(pasted.position.x).toBe(30) // 10 + 20 * 1
      expect(pasted.position.y).toBe(30)

      useStore.getState().pasteObjects()
      state = useStore.getState()
      pasted = state.objects[state.objects.length - 1]
      expect(pasted.position.x).toBe(50) // 10 + 20 * 2
      expect(pasted.position.y).toBe(50)
    })

    it('paste generates new IDs for group children', () => {
      const child = makeRect('c1')
      const group: GroupObject = {
        type: 'group',
        id: 'g1',
        children: [child],
        position: { x: 0, y: 0 },
        boundingBox: { x: 0, y: 0, width: 100, height: 50 },
      }
      useStore.getState().addObject(group)
      useStore.getState().copyObjects(new Set(['g1']))
      useStore.getState().pasteObjects()

      const state = useStore.getState()
      const pastedGroup = state.objects[state.objects.length - 1] as GroupObject
      expect(pastedGroup.id).not.toBe('g1')
      expect(pastedGroup.children[0].id).not.toBe('c1')
    })

    it('paste does nothing with empty clipboard', () => {
      useStore.getState().pasteObjects()
      expect(useStore.getState().objects).toHaveLength(0)
    })
  })

  describe('z-order', () => {
    it('bringForward swaps with adjacent object above', () => {
      const r1 = makeRect('r1')
      const r2 = makeRect('r2')
      const r3 = makeRect('r3')
      useStore.getState().addObject(r1)
      useStore.getState().addObject(r2)
      useStore.getState().addObject(r3)

      useStore.getState().bringForward(new Set(['r1']))
      const ids = useStore.getState().objects.map((o) => o.id)
      expect(ids).toEqual(['r2', 'r1', 'r3'])
    })

    it('sendBackward swaps with adjacent object below', () => {
      const r1 = makeRect('r1')
      const r2 = makeRect('r2')
      const r3 = makeRect('r3')
      useStore.getState().addObject(r1)
      useStore.getState().addObject(r2)
      useStore.getState().addObject(r3)

      useStore.getState().sendBackward(new Set(['r3']))
      const ids = useStore.getState().objects.map((o) => o.id)
      expect(ids).toEqual(['r1', 'r3', 'r2'])
    })

    it('bringToFront moves to end', () => {
      const r1 = makeRect('r1')
      const r2 = makeRect('r2')
      const r3 = makeRect('r3')
      useStore.getState().addObject(r1)
      useStore.getState().addObject(r2)
      useStore.getState().addObject(r3)

      useStore.getState().bringToFront(new Set(['r1']))
      const ids = useStore.getState().objects.map((o) => o.id)
      expect(ids).toEqual(['r2', 'r3', 'r1'])
    })

    it('sendToBack moves to start', () => {
      const r1 = makeRect('r1')
      const r2 = makeRect('r2')
      const r3 = makeRect('r3')
      useStore.getState().addObject(r1)
      useStore.getState().addObject(r2)
      useStore.getState().addObject(r3)

      useStore.getState().sendToBack(new Set(['r3']))
      const ids = useStore.getState().objects.map((o) => o.id)
      expect(ids).toEqual(['r3', 'r1', 'r2'])
    })
  })

  describe('image objects', () => {
    function makeImage(id: string, x = 0, y = 0): ImageObject {
      return {
        type: 'image',
        id,
        src: 'data:image/png;base64,abc',
        width: 200,
        height: 100,
        color: '#000',
        position: { x, y },
        boundingBox: { x: 0, y: 0, width: 200, height: 100 },
      }
    }

    it('adds image object', () => {
      const img = makeImage('img1', 50, 50)
      useStore.getState().addObject(img)
      const state = useStore.getState()
      expect(state.objects).toHaveLength(1)
      expect(state.objects[0].type).toBe('image')
      if (state.objects[0].type !== 'image') return
      expect(state.objects[0].src).toBe('data:image/png;base64,abc')
    })

    it('deletes image object', () => {
      const img = makeImage('img1')
      useStore.getState().addObject(img)
      useStore.getState().deleteObjects(new Set(['img1']))
      expect(useStore.getState().objects).toHaveLength(0)
    })

    it('moves image object', () => {
      const img = makeImage('img1', 10, 20)
      useStore.getState().addObject(img)
      useStore.getState().moveObjects(new Set(['img1']), 5, 10)
      const moved = useStore.getState().objects[0]
      expect(moved.position).toEqual({ x: 15, y: 30 })
    })

    it('duplicates image object with new ID', () => {
      const img = makeImage('img1', 50, 50)
      useStore.getState().addObject(img)
      useStore.getState().duplicateObjects(new Set(['img1']))
      const state = useStore.getState()
      expect(state.objects).toHaveLength(2)
      expect(state.objects[1].id).not.toBe('img1')
      expect(state.objects[1].type).toBe('image')
      expect(state.objects[1].position).toEqual({ x: 60, y: 60 })
    })

    it('copy/paste image object', () => {
      const img = makeImage('img1', 10, 10)
      useStore.getState().addObject(img)
      useStore.getState().copyObjects(new Set(['img1']))
      useStore.getState().pasteObjects()
      const state = useStore.getState()
      expect(state.objects).toHaveLength(2)
      const pasted = state.objects[1]
      expect(pasted.type).toBe('image')
      expect(pasted.position).toEqual({ x: 30, y: 30 })
    })

    it('undo/redo works with image objects', () => {
      const img = makeImage('img1')
      useStore.getState().addObject(img)
      expect(useStore.getState().objects).toHaveLength(1)

      useStore.getState().undo()
      expect(useStore.getState().objects).toHaveLength(0)

      useStore.getState().redo()
      expect(useStore.getState().objects).toHaveLength(1)
      expect(useStore.getState().objects[0].type).toBe('image')
    })

    it('groups image with rectangle', () => {
      const img = makeImage('img1', 0, 0)
      const rect = makeRect('r1', 300, 300)
      useStore.getState().addObject(img)
      useStore.getState().addObject(rect)

      useStore.getState().groupObjects(new Set(['img1', 'r1']))
      const state = useStore.getState()
      expect(state.objects).toHaveLength(1)
      const group = state.objects[0] as GroupObject
      expect(group.type).toBe('group')
      expect(group.children).toHaveLength(2)
      expect(group.children[0].type).toBe('image')
      expect(group.children[1].type).toBe('rectangle')
    })
  })

  describe('import/export round-trip', () => {
    function makeImage(id: string, x = 0, y = 0): ImageObject {
      return {
        type: 'image',
        id,
        src: 'data:image/png;base64,iVBORw0KGgo=',
        width: 200,
        height: 100,
        color: '#000',
        position: { x, y },
        boundingBox: { x: 0, y: 0, width: 200, height: 100 },
      }
    }

    it('round-trips a .lumi project without images', async () => {
      const rect = makeRect('r1', 10, 20)
      useStore.getState().addObject(rect)

      const zip = new JSZip()
      zip.file('project.json', JSON.stringify({
        version: 1,
        projectName: 'No Images',
        objects: useStore.getState().objects,
        viewport: useStore.getState().viewport,
      }))
      const buf = await zip.generateAsync({ type: 'arraybuffer' })
      const file = new File([buf], 'test.lumi')

      resetStore()
      await importProject(file)

      const state = useStore.getState()
      expect(state.objects).toHaveLength(1)
      expect(state.objects[0].type).toBe('rectangle')
      expect(state.objects[0].position).toEqual({ x: 10, y: 20 })
      expect(state.projectName).toBe('No Images')
    })

    it('round-trips a .lumi project with images', async () => {
      const img = makeImage('img1', 50, 60)
      const rect = makeRect('r1', 10, 20)

      const zip = new JSZip()
      const imgMatch = img.src.match(/^data:image\/(\w+);base64,(.+)$/)!
      const ext = imgMatch[1]
      const binary = atob(imgMatch[2])
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      zip.file(`images/${img.id}.${ext}`, bytes)

      const strippedImg = { ...img, src: `images/${img.id}.${ext}` }
      zip.file('project.json', JSON.stringify({
        version: 1,
        projectName: 'Test Project',
        objects: [strippedImg, rect],
        viewport: { offsetX: 0, offsetY: 0, scale: 1 },
      }))

      const buf = await zip.generateAsync({ type: 'arraybuffer' })
      const file = new File([buf], 'test.lumi')

      resetStore()
      await importProject(file)

      const state = useStore.getState()
      expect(state.objects).toHaveLength(2)
      expect(state.projectName).toBe('Test Project')

      const loadedImg = state.objects[0]
      expect(loadedImg.type).toBe('image')
      if (loadedImg.type !== 'image') return
      expect(loadedImg.src).toMatch(/^data:image\/png;base64,/)
      expect(loadedImg.position).toEqual({ x: 50, y: 60 })

      expect(state.objects[1].type).toBe('rectangle')
    })

    it('rejects .lumi without project.json', async () => {
      const zip = new JSZip()
      zip.file('readme.txt', 'hello')
      const buf = await zip.generateAsync({ type: 'arraybuffer' })
      const file = new File([buf], 'bad.lumi')
      await expect(importProject(file)).rejects.toThrow('no project.json')
    })
  })

  describe('projectName', () => {
    it('defaults to Untitled', () => {
      expect(useStore.getState().projectName).toBe('Untitled')
    })

    it('setProjectName updates state', () => {
      useStore.getState().setProjectName('My Drawing')
      expect(useStore.getState().projectName).toBe('My Drawing')
    })

    it('clearDrawing resets project name to Untitled', () => {
      useStore.getState().setProjectName('My Drawing')
      useStore.getState().clearDrawing()
      expect(useStore.getState().projectName).toBe('Untitled')
    })

    it('import restores projectName from data', async () => {
      const zip = new JSZip()
      zip.file('project.json', JSON.stringify({
        version: 1,
        projectName: 'Saved Project',
        objects: [makeRect('r1')],
        viewport: { offsetX: 0, offsetY: 0, scale: 1 },
      }))
      const buf = await zip.generateAsync({ type: 'arraybuffer' })
      const file = new File([buf], 'test.lumi', { type: 'application/octet-stream' })

      await importProject(file)
      expect(useStore.getState().projectName).toBe('Saved Project')
    })

    it('import falls back to filename when projectName missing', async () => {
      const zip = new JSZip()
      zip.file('project.json', JSON.stringify({
        version: 1,
        objects: [makeRect('r1')],
        viewport: { offsetX: 0, offsetY: 0, scale: 1 },
      }))
      const buf = await zip.generateAsync({ type: 'arraybuffer' })
      const file = new File([buf], 'my-sketch.lumi')

      await importProject(file)
      expect(useStore.getState().projectName).toBe('my-sketch')
    })
  })

  describe('group/ungroup', () => {
    it('groups objects with adjusted positions', () => {
      const r1 = makeRect('r1', 10, 20)
      const r2 = makeRect('r2', 200, 300)
      useStore.getState().addObject(r1)
      useStore.getState().addObject(r2)

      useStore.getState().groupObjects(new Set(['r1', 'r2']))
      const state = useStore.getState()
      expect(state.objects).toHaveLength(1)

      const group = state.objects[0] as GroupObject
      expect(group.type).toBe('group')
      expect(group.children).toHaveLength(2)
      // Group position should be at min of all children world positions
      expect(group.position.x).toBe(10)
      expect(group.position.y).toBe(20)
      // Children positions are relative to group
      expect(group.children[0].position).toEqual({ x: 0, y: 0 })
      expect(group.children[1].position).toEqual({ x: 190, y: 280 })
    })

    it('does not group fewer than 2 objects', () => {
      const r1 = makeRect('r1')
      useStore.getState().addObject(r1)
      useStore.getState().groupObjects(new Set(['r1']))
      expect(useStore.getState().objects).toHaveLength(1)
      expect(useStore.getState().objects[0].type).toBe('rectangle')
    })

    it('ungroup restores world positions', () => {
      const r1 = makeRect('r1', 10, 20)
      const r2 = makeRect('r2', 200, 300)
      useStore.getState().addObject(r1)
      useStore.getState().addObject(r2)

      useStore.getState().groupObjects(new Set(['r1', 'r2']))
      const groupId = useStore.getState().objects[0].id

      useStore.getState().ungroupObjects(new Set([groupId]))
      const state = useStore.getState()
      expect(state.objects).toHaveLength(2)

      // Children should have world positions restored
      const obj1 = state.objects.find((o) => o.id === 'r1')!
      const obj2 = state.objects.find((o) => o.id === 'r2')!
      expect(obj1.position).toEqual({ x: 10, y: 20 })
      expect(obj2.position).toEqual({ x: 200, y: 300 })
    })

    it('selects group after grouping', () => {
      const r1 = makeRect('r1')
      const r2 = makeRect('r2', 100)
      useStore.getState().addObject(r1)
      useStore.getState().addObject(r2)

      useStore.getState().groupObjects(new Set(['r1', 'r2']))
      const state = useStore.getState()
      expect(state.selectedIds.size).toBe(1)
      expect(state.selectedIds.has(state.objects[0].id)).toBe(true)
    })

    it('selects children after ungrouping', () => {
      const r1 = makeRect('r1')
      const r2 = makeRect('r2', 100)
      useStore.getState().addObject(r1)
      useStore.getState().addObject(r2)

      useStore.getState().groupObjects(new Set(['r1', 'r2']))
      const groupId = useStore.getState().objects[0].id
      useStore.getState().ungroupObjects(new Set([groupId]))

      const state = useStore.getState()
      expect(state.selectedIds.has('r1')).toBe(true)
      expect(state.selectedIds.has('r2')).toBe(true)
    })
  })
})
