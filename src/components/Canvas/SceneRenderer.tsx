import { memo } from 'react'
import { useStore } from '../../store/useStore'
import type { SceneObject, TextObject } from '../../types/scene'

const LINE_HEIGHT_FACTOR = 1.3

const TextElement = memo(function TextElement({ obj }: { obj: TextObject }) {
  const lines = obj.text.split('\n')
  const lineHeight = obj.fontSize * LINE_HEIGHT_FACTOR

  return (
    <text
      fontFamily="'Humor Sans', cursive"
      fontSize={obj.fontSize}
      fill={obj.color}
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

const PathElement = memo(function PathElement({ obj }: { obj: Exclude<SceneObject, TextObject> }) {
  const isShape = obj.type !== 'pen'

  return (
    <path
      d={obj.pathData}
      fill={isShape ? 'none' : obj.color}
      stroke={isShape ? obj.color : undefined}
      strokeWidth={isShape ? 2 : undefined}
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
