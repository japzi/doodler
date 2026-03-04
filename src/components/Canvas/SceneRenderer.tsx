import { memo } from 'react'
import { useStore } from '../../store/useStore'
import type { SceneObject, TextObject, RectangleShape, EllipseShape, GroupObject } from '../../types/scene'
import { generateRoughHatchLines } from '../../rendering/roughPath'
import { DEFAULT_FONT_FAMILY, getFontFamilyCss } from '../../fonts/fontRegistry'

const LINE_HEIGHT_FACTOR = 1.3

const TextElement = memo(function TextElement({ obj }: { obj: TextObject }) {
  const lines = obj.text.split('\n')
  const lineHeight = obj.fontSize * LINE_HEIGHT_FACTOR
  const fontCss = getFontFamilyCss(obj.fontFamily ?? DEFAULT_FONT_FAMILY)

  return (
    <text
      fontFamily={fontCss}
      fontSize={obj.fontSize}
      fontWeight={obj.bold ? 'bold' : 'normal'}
      fontStyle={obj.italic ? 'italic' : 'normal'}
      textDecoration={obj.underline ? 'underline' : undefined}
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

function HatchShadow({ obj }: { obj: RectangleShape | EllipseShape }) {
  if (!obj.shadow) return null
  const offset = obj.shadow.offset
  const clipId = `shadow-clip-${obj.id}`
  const strokeWidth = obj.strokeWidth ?? 2
  const hatchPaths = generateRoughHatchLines(obj.x, obj.y, obj.width, obj.height)

  return (
    <g transform={`translate(${offset}, ${offset})`}>
      <defs>
        <clipPath id={clipId}>
          {obj.type === 'rectangle' ? (
            <rect x={obj.x} y={obj.y} width={obj.width} height={obj.height} />
          ) : (
            <ellipse cx={obj.x + obj.width / 2} cy={obj.y + obj.height / 2} rx={obj.width / 2} ry={obj.height / 2} />
          )}
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {hatchPaths.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={obj.color} strokeWidth={1.5} />
        ))}
      </g>
      <path d={obj.pathData} fill="none" stroke={obj.color} strokeWidth={strokeWidth} />
    </g>
  )
}

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
  const hasShadow = (obj.type === 'rectangle' || obj.type === 'ellipse') && obj.shadow
  const needsHitTarget = strokeWidth < HIT_TARGET_WIDTH

  if (hasFill) {
    return (
      <g
        transform={`translate(${obj.position.x}, ${obj.position.y})`}
        data-object-id={obj.id}
        style={{ cursor: 'default' }}
      >
        {hasShadow && <HatchShadow obj={obj as RectangleShape | EllipseShape} />}
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
      {hasShadow && <HatchShadow obj={obj as RectangleShape | EllipseShape} />}
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
  const fontCss = getFontFamilyCss(obj.fontFamily ?? DEFAULT_FONT_FAMILY)
  return (
    <text
      fontFamily={fontCss}
      fontSize={obj.fontSize}
      fontWeight={obj.bold ? 'bold' : 'normal'}
      fontStyle={obj.italic ? 'italic' : 'normal'}
      textDecoration={obj.underline ? 'underline' : undefined}
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
  const hasShadow = (obj.type === 'rectangle' || obj.type === 'ellipse') && obj.shadow
  const needsHitTarget = strokeWidth < HIT_TARGET_WIDTH

  if (hasFill) {
    return (
      <g transform={`translate(${obj.position.x}, ${obj.position.y})`} style={{ cursor: 'default' }}>
        {hasShadow && <HatchShadow obj={obj as RectangleShape | EllipseShape} />}
        <FillShape obj={obj as RectangleShape | EllipseShape} />
        <path d={obj.pathData} fill="none" stroke={obj.color} strokeWidth={strokeWidth} />
      </g>
    )
  }

  return (
    <g transform={`translate(${obj.position.x}, ${obj.position.y})`} style={{ cursor: 'default' }}>
      {hasShadow && <HatchShadow obj={obj as RectangleShape | EllipseShape} />}
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
