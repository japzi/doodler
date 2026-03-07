import { memo } from 'react'
import { useStore } from '../../store/useStore'
import type { SceneObject, TextObject, RectangleShape, EllipseShape, CloudShape, PolygonShape, ImageObject, GroupObject } from '../../types/scene'
import { generateRoughHatchLines, generateCloudOutlinePath } from '../../rendering/roughPath'
import { DEFAULT_FONT_FAMILY, getFontFamilyCss } from '../../fonts/fontRegistry'

const LINE_HEIGHT_FACTOR = 1.3

function buildTransform(obj: SceneObject): string {
  const tx = obj.position.x
  const ty = obj.position.y
  const rotation = obj.rotation ?? 0
  if (rotation === 0) {
    return `translate(${tx}, ${ty})`
  }
  const bb = obj.boundingBox
  const cx = bb.x + bb.width / 2
  const cy = bb.y + bb.height / 2
  return `translate(${tx}, ${ty}) rotate(${rotation}, ${cx}, ${cy})`
}

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
      transform={buildTransform(obj)}
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

function computeShadowOffset(offset: number, shadowAngle: number, objectRotation: number) {
  const localAngle = (shadowAngle - objectRotation) * Math.PI / 180
  return {
    dx: offset * Math.cos(localAngle),
    dy: offset * Math.sin(localAngle),
  }
}

function HatchShadow({ obj }: { obj: RectangleShape | EllipseShape | CloudShape | PolygonShape }) {
  if (!obj.shadow) return null
  const offset = obj.shadow.offset
  const shadowAngle = obj.shadow.angle ?? 135
  const rotation = obj.rotation ?? 0
  const { dx, dy } = computeShadowOffset(offset, shadowAngle, rotation)
  const clipId = `shadow-clip-${obj.id}`
  const strokeWidth = obj.strokeWidth ?? 2
  const bb = obj.boundingBox

  // Generate hatch lines for an expanded area so they still cover the shape after counter-rotation
  const diag = Math.sqrt(bb.width * bb.width + bb.height * bb.height)
  const cx = bb.x + bb.width / 2
  const cy = bb.y + bb.height / 2
  const hatchBb = rotation !== 0
    ? { x: cx - diag / 2, y: cy - diag / 2, w: diag, h: diag }
    : { x: bb.x, y: bb.y, w: bb.width, h: bb.height }
  const hatchPaths = generateRoughHatchLines(hatchBb.x, hatchBb.y, hatchBb.w, hatchBb.h)

  // Counter-rotate hatch lines to maintain world-space direction
  const hatchTransform = rotation !== 0
    ? `rotate(${-rotation}, ${cx}, ${cy})`
    : undefined

  let clipShape: React.ReactNode
  if (obj.type === 'polygon') {
    const pts = obj.points.map((p) => `${p.x},${p.y}`).join(' ')
    clipShape = <polygon points={pts} />
  } else if (obj.type === 'cloud') {
    const cloudPath = generateCloudOutlinePath(obj.x, obj.y, obj.width, obj.height)
    clipShape = <path d={cloudPath} />
  } else if (obj.type === 'rectangle') {
    clipShape = <rect x={obj.x} y={obj.y} width={obj.width} height={obj.height} />
  } else {
    clipShape = <ellipse cx={obj.x + obj.width / 2} cy={obj.y + obj.height / 2} rx={obj.width / 2} ry={obj.height / 2} />
  }

  const opacity = obj.opacity ?? 1
  const shadowOpacity = opacity * opacity * opacity
  const strokeOpacity = obj.strokeOpacity ?? 1

  return (
    <g transform={`translate(${dx}, ${dy})`}>
      <defs>
        <clipPath id={clipId}>
          {clipShape}
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`} opacity={shadowOpacity !== 1 ? shadowOpacity : undefined}>
        <g transform={hatchTransform}>
          {hatchPaths.map((d, i) => (
            <path key={i} d={d} fill="none" stroke={obj.color} strokeWidth={1.5} />
          ))}
        </g>
      </g>
      <path d={obj.pathData} fill="none" stroke={obj.color} strokeWidth={strokeWidth} opacity={strokeOpacity !== 1 ? strokeOpacity : undefined} />
    </g>
  )
}

function FillShape({ obj }: { obj: RectangleShape | EllipseShape | CloudShape | PolygonShape }) {
  const fillColor = obj.fillColor ?? 'none'
  if (fillColor === 'none' || fillColor === 'transparent') return null
  const opacity = obj.opacity ?? 1

  if (obj.type === 'rectangle') {
    return <rect x={obj.x} y={obj.y} width={obj.width} height={obj.height} fill={fillColor} stroke="none" opacity={opacity !== 1 ? opacity : undefined} />
  }
  if (obj.type === 'cloud') {
    const cloudPath = generateCloudOutlinePath(obj.x, obj.y, obj.width, obj.height)
    return <path d={cloudPath} fill={fillColor} stroke="none" opacity={opacity !== 1 ? opacity : undefined} />
  }
  if (obj.type === 'polygon') {
    const pts = obj.points.map((p) => `${p.x},${p.y}`).join(' ')
    return <polygon points={pts} fill={fillColor} stroke="none" opacity={opacity !== 1 ? opacity : undefined} />
  }
  return <path d={obj.pathData} fill={fillColor} stroke="none" opacity={opacity !== 1 ? opacity : undefined} />
}

const HIT_TARGET_WIDTH = 20

const PathElement = memo(function PathElement({ obj }: { obj: Exclude<SceneObject, TextObject | ImageObject | GroupObject> }) {
  const isShape = obj.type !== 'pen'
  const strokeWidth = 'strokeWidth' in obj ? (obj.strokeWidth ?? 2) : 2
  const hasFill = (obj.type === 'rectangle' || obj.type === 'ellipse' || obj.type === 'cloud' || obj.type === 'polygon') && obj.fillColor && obj.fillColor !== 'none' && obj.fillColor !== 'transparent'
  const hasShadow = (obj.type === 'rectangle' || obj.type === 'ellipse' || obj.type === 'cloud' || obj.type === 'polygon') && obj.shadow
  const needsHitTarget = strokeWidth < HIT_TARGET_WIDTH
  const strokeOpacity = ('strokeOpacity' in obj ? obj.strokeOpacity : undefined) ?? 1

  if (hasFill) {
    return (
      <g
        transform={buildTransform(obj)}
        data-object-id={obj.id}
        style={{ cursor: 'default' }}
      >
        {hasShadow && <HatchShadow obj={obj as RectangleShape | EllipseShape | CloudShape | PolygonShape} />}
        <FillShape obj={obj as RectangleShape | EllipseShape | CloudShape | PolygonShape} />
        <path
          d={obj.pathData}
          fill="none"
          stroke={obj.color}
          strokeWidth={strokeWidth}
          opacity={strokeOpacity !== 1 ? strokeOpacity : undefined}
        />
      </g>
    )
  }

  return (
    <g
      transform={buildTransform(obj)}
      data-object-id={obj.id}
      style={{ cursor: 'default' }}
    >
      {hasShadow && <HatchShadow obj={obj as RectangleShape | EllipseShape | CloudShape | PolygonShape} />}
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
        opacity={strokeOpacity !== 1 ? strokeOpacity : undefined}
      />
    </g>
  )
})

const ImageElement = memo(function ImageElement({ obj }: { obj: ImageObject }) {
  return (
    <image
      href={obj.src}
      x={0} y={0}
      width={obj.width} height={obj.height}
      opacity={obj.opacity ?? 1}
      transform={buildTransform(obj)}
      data-object-id={obj.id}
      style={{ cursor: 'default' }}
    />
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
      transform={buildTransform(obj)}
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

function ChildPathElement({ obj }: { obj: Exclude<SceneObject, TextObject | ImageObject | GroupObject> }) {
  const isShape = obj.type !== 'pen'
  const strokeWidth = 'strokeWidth' in obj ? (obj.strokeWidth ?? 2) : 2
  const hasFill = (obj.type === 'rectangle' || obj.type === 'ellipse' || obj.type === 'cloud' || obj.type === 'polygon') && obj.fillColor && obj.fillColor !== 'none' && obj.fillColor !== 'transparent'
  const hasShadow = (obj.type === 'rectangle' || obj.type === 'ellipse' || obj.type === 'cloud' || obj.type === 'polygon') && obj.shadow
  const needsHitTarget = strokeWidth < HIT_TARGET_WIDTH
  const strokeOpacity = ('strokeOpacity' in obj ? obj.strokeOpacity : undefined) ?? 1

  if (hasFill) {
    return (
      <g transform={buildTransform(obj)} style={{ cursor: 'default' }}>
        {hasShadow && <HatchShadow obj={obj as RectangleShape | EllipseShape | CloudShape | PolygonShape} />}
        <FillShape obj={obj as RectangleShape | EllipseShape | CloudShape | PolygonShape} />
        <path d={obj.pathData} fill="none" stroke={obj.color} strokeWidth={strokeWidth} opacity={strokeOpacity !== 1 ? strokeOpacity : undefined} />
      </g>
    )
  }

  return (
    <g transform={buildTransform(obj)} style={{ cursor: 'default' }}>
      {hasShadow && <HatchShadow obj={obj as RectangleShape | EllipseShape | CloudShape | PolygonShape} />}
      {needsHitTarget && <path d={obj.pathData} fill="none" stroke="transparent" strokeWidth={HIT_TARGET_WIDTH} />}
      <path
        d={obj.pathData}
        fill={isShape ? 'none' : obj.color}
        stroke={isShape ? obj.color : undefined}
        strokeWidth={isShape ? strokeWidth : undefined}
        opacity={strokeOpacity !== 1 ? strokeOpacity : undefined}
      />
    </g>
  )
}

function ChildImageElement({ obj }: { obj: ImageObject }) {
  return (
    <image
      href={obj.src}
      x={0} y={0}
      width={obj.width} height={obj.height}
      opacity={obj.opacity ?? 1}
      transform={buildTransform(obj)}
      style={{ cursor: 'default' }}
    />
  )
}

function renderGroupChild(obj: SceneObject): React.ReactNode {
  if (obj.type === 'group') {
    return (
      <g key={obj.id} transform={buildTransform(obj)}>
        {obj.children.map(renderGroupChild)}
      </g>
    )
  }
  if (obj.type === 'text') return <ChildTextElement key={obj.id} obj={obj} />
  if (obj.type === 'image') return <ChildImageElement key={obj.id} obj={obj} />
  return <ChildPathElement key={obj.id} obj={obj} />
}

const GroupElement = memo(function GroupElement({ obj }: { obj: GroupObject }) {
  return (
    <g
      transform={buildTransform(obj)}
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
        if (obj.type === 'image') {
          return <ImageElement key={obj.id} obj={obj} />
        }
        return <PathElement key={obj.id} obj={obj} />
      })}
    </g>
  )
}
