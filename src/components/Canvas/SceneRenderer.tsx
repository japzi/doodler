import { memo } from 'react'
import { useStore } from '../../store/useStore'
import type { SceneObject, TextObject, RectangleShape, EllipseShape, GroupObject } from '../../types/scene'

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

function FillShape({ obj }: { obj: RectangleShape | EllipseShape }) {
  const fillColor = obj.fillColor ?? 'none'
  if (fillColor === 'none' || fillColor === 'transparent') return null
  const opacity = obj.opacity ?? 1

  if (obj.type === 'rectangle') {
    return <rect x={obj.x} y={obj.y} width={obj.width} height={obj.height} fill={fillColor} stroke="none" opacity={opacity !== 1 ? opacity : undefined} />
  }
  return <path d={obj.pathData} fill={fillColor} stroke="none" opacity={opacity !== 1 ? opacity : undefined} />
}

const HIT_TARGET_WIDTH = 20

const PathElement = memo(function PathElement({ obj }: { obj: Exclude<SceneObject, TextObject | GroupObject> }) {
  const isShape = obj.type !== 'pen'
  const strokeWidth = 'strokeWidth' in obj ? (obj.strokeWidth ?? 2) : 2
  const hasFill = (obj.type === 'rectangle' || obj.type === 'ellipse') && obj.fillColor && obj.fillColor !== 'none' && obj.fillColor !== 'transparent'
  const needsHitTarget = strokeWidth < HIT_TARGET_WIDTH

  if (hasFill) {
    return (
      <g
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
    <g
      transform={`translate(${obj.position.x}, ${obj.position.y})`}
      data-object-id={obj.id}
      style={{ cursor: 'default' }}
    >
      {needsHitTarget && (
        <path
          d={obj.pathData}
          fill="none"
          stroke="transparent"
          strokeWidth={HIT_TARGET_WIDTH}
        />
      )}
      <path
        d={obj.pathData}
        fill={isShape ? 'none' : obj.color}
        stroke={isShape ? obj.color : undefined}
        strokeWidth={isShape ? strokeWidth : undefined}
      />
    </g>
  )
})

function ChildTextElement({ obj }: { obj: TextObject }) {
  const lines = obj.text.split('\n')
  const lineHeight = obj.fontSize * LINE_HEIGHT_FACTOR
  return (
    <text
      fontFamily="'Humor Sans', cursive"
      fontSize={obj.fontSize}
      fill={obj.color}
      transform={`translate(${obj.position.x}, ${obj.position.y})`}
      style={{ cursor: 'default' }}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={0} dy={i === 0 ? 0 : lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

function ChildPathElement({ obj }: { obj: Exclude<SceneObject, TextObject | GroupObject> }) {
  const isShape = obj.type !== 'pen'
  const strokeWidth = 'strokeWidth' in obj ? (obj.strokeWidth ?? 2) : 2
  const hasFill = (obj.type === 'rectangle' || obj.type === 'ellipse') && obj.fillColor && obj.fillColor !== 'none' && obj.fillColor !== 'transparent'
  const needsHitTarget = strokeWidth < HIT_TARGET_WIDTH

  if (hasFill) {
    return (
      <g transform={`translate(${obj.position.x}, ${obj.position.y})`} style={{ cursor: 'default' }}>
        <FillShape obj={obj as RectangleShape | EllipseShape} />
        <path d={obj.pathData} fill="none" stroke={obj.color} strokeWidth={strokeWidth} />
      </g>
    )
  }

  return (
    <g transform={`translate(${obj.position.x}, ${obj.position.y})`} style={{ cursor: 'default' }}>
      {needsHitTarget && <path d={obj.pathData} fill="none" stroke="transparent" strokeWidth={HIT_TARGET_WIDTH} />}
      <path
        d={obj.pathData}
        fill={isShape ? 'none' : obj.color}
        stroke={isShape ? obj.color : undefined}
        strokeWidth={isShape ? strokeWidth : undefined}
      />
    </g>
  )
}

function renderGroupChild(obj: SceneObject): React.ReactNode {
  if (obj.type === 'group') {
    return (
      <g key={obj.id} transform={`translate(${obj.position.x}, ${obj.position.y})`}>
        {obj.children.map(renderGroupChild)}
      </g>
    )
  }
  if (obj.type === 'text') return <ChildTextElement key={obj.id} obj={obj} />
  return <ChildPathElement key={obj.id} obj={obj} />
}

const GroupElement = memo(function GroupElement({ obj }: { obj: GroupObject }) {
  return (
    <g
      transform={`translate(${obj.position.x}, ${obj.position.y})`}
      data-object-id={obj.id}
      style={{ cursor: 'default' }}
    >
      {obj.children.map(renderGroupChild)}
    </g>
  )
})

export function SceneRenderer() {
  const objects = useStore((s) => s.objects)
  const editingTextId = useStore((s) => s.editingTextId)

  return (
    <g>
      {objects.map((obj) => {
        if (obj.id === editingTextId) return null
        if (obj.type === 'group') {
          return <GroupElement key={obj.id} obj={obj} />
        }
        if (obj.type === 'text') {
          return <TextElement key={obj.id} obj={obj} />
        }
        return <PathElement key={obj.id} obj={obj} />
      })}
    </g>
  )
}
