export interface Point {
  x: number
  y: number
  pressure?: number
}

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface PenStroke {
  type: 'pen'
  id: string
  points: Point[]
  pathData: string
  color: string
  position: { x: number; y: number }
  boundingBox: BoundingBox
}

export interface RectangleShape {
  type: 'rectangle'
  id: string
  x: number
  y: number
  width: number
  height: number
  color: string
  pathData: string
  position: { x: number; y: number }
  boundingBox: BoundingBox
}

export interface EllipseShape {
  type: 'ellipse'
  id: string
  x: number
  y: number
  width: number
  height: number
  color: string
  pathData: string
  position: { x: number; y: number }
  boundingBox: BoundingBox
}

export interface LineShape {
  type: 'line'
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  pathData: string
  position: { x: number; y: number }
  boundingBox: BoundingBox
}

export interface ArrowShape {
  type: 'arrow'
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  pathData: string
  position: { x: number; y: number }
  boundingBox: BoundingBox
}

export type SceneObject = PenStroke | RectangleShape | EllipseShape | LineShape | ArrowShape

export interface ViewportTransform {
  offsetX: number
  offsetY: number
  scale: number
}

export type ToolType = 'pointer' | 'pen' | 'rectangle' | 'ellipse' | 'line' | 'arrow'

export type ShapeToolType = 'rectangle' | 'ellipse' | 'line' | 'arrow'

export interface ShapePreview {
  type: ShapeToolType
  x: number
  y: number
  width: number
  height: number
  x1: number
  y1: number
  x2: number
  y2: number
}
