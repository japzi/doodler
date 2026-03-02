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

export type SceneObject = PenStroke

export interface ViewportTransform {
  offsetX: number
  offsetY: number
  scale: number
}

export type ToolType = 'pointer' | 'pen'
