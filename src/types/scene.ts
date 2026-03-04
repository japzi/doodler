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
  strokeWidth?: number
  opacity?: number
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
  fillColor?: string
  strokeWidth?: number
  opacity?: number
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
  fillColor?: string
  strokeWidth?: number
  opacity?: number
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
  cp1?: { x: number; y: number }
  cp2?: { x: number; y: number }
  color: string
  strokeWidth?: number
  opacity?: number
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
  cp1?: { x: number; y: number }
  cp2?: { x: number; y: number }
  arrowHeadSize?: number
  color: string
  strokeWidth?: number
  opacity?: number
  pathData: string
  position: { x: number; y: number }
  boundingBox: BoundingBox
}

export interface TextObject {
  type: 'text'
  id: string
  text: string
  fontSize: number
  color: string
  opacity?: number
  position: { x: number; y: number }
  boundingBox: BoundingBox
}

export type SceneObject = PenStroke | RectangleShape | EllipseShape | LineShape | ArrowShape | TextObject

export interface ViewportTransform {
  offsetX: number
  offsetY: number
  scale: number
}

export type ToolType = 'pointer' | 'pen' | 'rectangle' | 'ellipse' | 'line' | 'arrow' | 'text'

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
