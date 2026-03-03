import { useStore } from '../../store/useStore'

export function ActiveShapeRenderer() {
  const preview = useStore((s) => s.activeShapePreview)
  const strokeColor = useStore((s) => s.strokeColor)
  const fillColor = useStore((s) => s.fillColor)
  const strokeWidth = useStore((s) => s.strokeWidth)

  if (!preview) return null

  const showFill = (preview.type === 'rectangle' || preview.type === 'ellipse') && fillColor !== 'transparent' && fillColor !== 'none'

  const commonProps = {
    fill: 'none',
    stroke: strokeColor,
    strokeWidth,
    strokeDasharray: '6 3',
    vectorEffect: 'non-scaling-stroke' as const,
  }

  switch (preview.type) {
    case 'rectangle':
      return (
        <g>
          {showFill && (
            <rect x={preview.x} y={preview.y} width={preview.width} height={preview.height} fill={fillColor} stroke="none" opacity={0.5} />
          )}
          <rect
            x={preview.x}
            y={preview.y}
            width={preview.width}
            height={preview.height}
            {...commonProps}
          />
        </g>
      )
    case 'ellipse':
      return (
        <g>
          {showFill && (
            <ellipse cx={preview.x + preview.width / 2} cy={preview.y + preview.height / 2} rx={preview.width / 2} ry={preview.height / 2} fill={fillColor} stroke="none" opacity={0.5} />
          )}
          <ellipse
            cx={preview.x + preview.width / 2}
            cy={preview.y + preview.height / 2}
            rx={preview.width / 2}
            ry={preview.height / 2}
            {...commonProps}
          />
        </g>
      )
    case 'line':
      return (
        <line
          x1={preview.x1}
          y1={preview.y1}
          x2={preview.x2}
          y2={preview.y2}
          {...commonProps}
        />
      )
    case 'arrow': {
      const angle = Math.atan2(preview.y2 - preview.y1, preview.x2 - preview.x1)
      const headLength = 16
      const headAngle = Math.PI / 6
      const ax = preview.x2 - headLength * Math.cos(angle - headAngle)
      const ay = preview.y2 - headLength * Math.sin(angle - headAngle)
      const bx = preview.x2 - headLength * Math.cos(angle + headAngle)
      const by = preview.y2 - headLength * Math.sin(angle + headAngle)

      return (
        <g>
          <line x1={preview.x1} y1={preview.y1} x2={preview.x2} y2={preview.y2} {...commonProps} />
          <line x1={preview.x2} y1={preview.y2} x2={ax} y2={ay} {...commonProps} />
          <line x1={preview.x2} y1={preview.y2} x2={bx} y2={by} {...commonProps} />
        </g>
      )
    }
  }
}
