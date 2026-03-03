import { memo } from 'react'
import { useStore } from '../../store/useStore'
import type { SceneObject, TextObject, RectangleShape, EllipseShape } from '../../types/scene'

const LINE_HEIGHT_FACTOR = 1.3

const TextElement = memo(function TextElement({ obj }: { obj: TextObject }) {
  const lines = obj.text.split('\n')
  const lineHeight = obj.fontSize * LINE_HEIGHT_FACTOR
  const opacity = obj.opacity ?? 1

  return (
    <text
      fontFamily="'Humor Sans', cursive"
      fontSize={obj.fontSize}
      fill={obj.color}
      opacity={opacity !== 1 ? opacity : undefined}
      transform={`translate(${obj.position.x}, ${obj.position.y})`}
      data-object-id={obj.id}
      style={{ cursor: 'default' }}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={0} dy={i === 0 ? 0 : lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  )
})

function FillShape({ obj }: { obj: RectangleShape | EllipseShape }) {
  const fillColor = obj.fillColor ?? 'none'
  if (fillColor === 'none' || fillColor === 'transparent') return null

  if (obj.type === 'rectangle') {
    return <rect x={obj.x} y={obj.y} width={obj.width} height={obj.height} fill={fillColor} stroke="none" />
  }
  const cx = obj.x + obj.width / 2
  const cy = obj.y + obj.height / 2
  return <ellipse cx={cx} cy={cy} rx={obj.width / 2} ry={obj.height / 2} fill={fillColor} stroke="none" />
}

const PathElement = memo(function PathElement({ obj }: { obj: Exclude<SceneObject, TextObject> }) {
  const isShape = obj.type !== 'pen'
  const opacity = obj.opacity ?? 1
  const strokeWidth = 'strokeWidth' in obj ? (obj.strokeWidth ?? 2) : 2
  const hasFill = (obj.type === 'rectangle' || obj.type === 'ellipse') && obj.fillColor && obj.fillColor !== 'none' && obj.fillColor !== 'transparent'

  if (hasFill) {
    return (
      <g
        opacity={opacity !== 1 ? opacity : undefined}
        transform={`translate(${obj.position.x}, ${obj.position.y})`}
        data-object-id={obj.id}
        style={{ cursor: 'default' }}
      >
        <FillShape obj={obj as RectangleShape | EllipseShape} />
        <path
          d={obj.pathData}
          fill="none"
          stroke={obj.color}
          strokeWidth={strokeWidth}
        />
      </g>
    )
  }

  return (
    <path
      d={obj.pathData}
      fill={isShape ? 'none' : obj.color}
      stroke={isShape ? obj.color : undefined}
      strokeWidth={isShape ? strokeWidth : undefined}
      opacity={opacity !== 1 ? opacity : undefined}
      transform={`translate(${obj.position.x}, ${obj.position.y})`}
      data-object-id={obj.id}
      style={{ cursor: 'default' }}
    />
  )
})

export function SceneRenderer() {
  const objects = useStore((s) => s.objects)
  const editingTextId = useStore((s) => s.editingTextId)

  return (
    <g>
      {objects.map((obj) => {
        if (obj.id === editingTextId) return null
        if (obj.type === 'text') {
          return <TextElement key={obj.id} obj={obj} />
        }
        return <PathElement key={obj.id} obj={obj} />
      })}
    </g>
  )
}
