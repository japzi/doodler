import { useStore } from '../../store/useStore'
import type { ArrowShape } from '../../types/scene'

export function SelectionOverlay() {
  const selectedIds = useStore((s) => s.selectedIds)
  const objects = useStore((s) => s.objects)
  const marqueeRect = useStore((s) => s.marqueeRect)
  const viewport = useStore((s) => s.viewport)

  const padding = 8
  const handleSize = 8 / viewport.scale
  const handleRadius = 5 / viewport.scale

  let selectionEl: React.ReactNode = null

  if (selectedIds.size > 0) {
    const selected = objects.filter((o) => selectedIds.has(o.id))
    if (selected.length > 0) {
      // Single arrow selection — show arrow-specific handles
      const isSingleArrow = selected.length === 1 && selected[0].type === 'arrow'

      if (isSingleArrow) {
        const arrow = selected[0] as ArrowShape
        const ox = arrow.position.x
        const oy = arrow.position.y
        const p1x = ox + arrow.x1
        const p1y = oy + arrow.y1
        const p2x = ox + arrow.x2
        const p2y = oy + arrow.y2
        const isCurved = !!(arrow.cp1 && arrow.cp2)

        // Compute arrowhead size handle position — along one wing of the arrowhead
        const headSize = arrow.arrowHeadSize ?? 16
        let arrowAngle: number
        if (isCurved) {
          let tdx = arrow.x2 - arrow.cp2!.x
          let tdy = arrow.y2 - arrow.cp2!.y
          if (Math.abs(tdx) < 0.001 && Math.abs(tdy) < 0.001) {
            tdx = arrow.x2 - arrow.x1
            tdy = arrow.y2 - arrow.y1
          }
          arrowAngle = Math.atan2(tdy, tdx)
        } else {
          arrowAngle = Math.atan2(p2y - p1y, p2x - p1x)
        }
        const headAngle = Math.PI / 6
        const hsHandleX = p2x - headSize * Math.cos(arrowAngle - headAngle)
        const hsHandleY = p2y - headSize * Math.sin(arrowAngle - headAngle)

        const headSizeHandle = (
          <circle
            data-arrow-handle="headSize"
            cx={hsHandleX}
            cy={hsHandleY}
            r={handleRadius}
            fill="#f5c542"
            stroke="#c49b1a"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            style={{ cursor: 'ew-resize' }}
            pointerEvents="auto"
          />
        )

        const endpointHandles = (
          <>
            <circle
              data-arrow-handle="p1"
              cx={p1x}
              cy={p1y}
              r={handleRadius}
              fill="white"
              stroke="#4a90d9"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              style={{ cursor: 'move' }}
              pointerEvents="auto"
            />
            <circle
              data-arrow-handle="p2"
              cx={p2x}
              cy={p2y}
              r={handleRadius}
              fill="white"
              stroke="#4a90d9"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              style={{ cursor: 'move' }}
              pointerEvents="auto"
            />
          </>
        )

        if (isCurved) {
          const cp1x = ox + arrow.cp1!.x
          const cp1y = oy + arrow.cp1!.y
          const cp2x = ox + arrow.cp2!.x
          const cp2y = oy + arrow.cp2!.y

          selectionEl = (
            <>
              {/* Tangent lines */}
              <line
                x1={p1x} y1={p1y} x2={cp1x} y2={cp1y}
                stroke="#4a90d9" strokeWidth={1} strokeDasharray="4 2"
                vectorEffect="non-scaling-stroke" pointerEvents="none"
              />
              <line
                x1={p2x} y1={p2y} x2={cp2x} y2={cp2y}
                stroke="#4a90d9" strokeWidth={1} strokeDasharray="4 2"
                vectorEffect="non-scaling-stroke" pointerEvents="none"
              />
              {endpointHandles}
              {/* Control point handles */}
              <circle
                data-arrow-handle="cp1"
                cx={cp1x} cy={cp1y} r={handleRadius}
                fill="#4a90d9" stroke="white" strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                style={{ cursor: 'move' }}
                pointerEvents="auto"
              />
              <circle
                data-arrow-handle="cp2"
                cx={cp2x} cy={cp2y} r={handleRadius}
                fill="#4a90d9" stroke="white" strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                style={{ cursor: 'move' }}
                pointerEvents="auto"
              />
              {headSizeHandle}
            </>
          )
        } else {
          // Straight arrow — show midpoint indicator
          const mx = (p1x + p2x) / 2
          const my = (p1y + p2y) / 2

          selectionEl = (
            <>
              {endpointHandles}
              <circle
                className="arrow-midpoint-indicator"
                data-arrow-handle="midpoint"
                cx={mx} cy={my} r={handleRadius}
                fill="transparent" stroke="transparent" strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                style={{ cursor: 'pointer' }}
                pointerEvents="auto"
              />
              {headSizeHandle}
            </>
          )
        }
      } else {
        // Multi-selection or non-arrow: existing bounding box behavior
        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity

        for (const obj of selected) {
          const bb = obj.boundingBox
          const ox = obj.position.x
          const oy = obj.position.y
          minX = Math.min(minX, bb.x + ox)
          minY = Math.min(minY, bb.y + oy)
          maxX = Math.max(maxX, bb.x + bb.width + ox)
          maxY = Math.max(maxY, bb.y + bb.height + oy)
        }

        const bx = minX - padding
        const by = minY - padding
        const bw = maxX - minX + padding * 2
        const bh = maxY - minY + padding * 2

        const corners: { key: string; cx: number; cy: number; cursor: string }[] = [
          { key: 'nw', cx: bx, cy: by, cursor: 'nwse-resize' },
          { key: 'ne', cx: bx + bw, cy: by, cursor: 'nesw-resize' },
          { key: 'sw', cx: bx, cy: by + bh, cursor: 'nesw-resize' },
          { key: 'se', cx: bx + bw, cy: by + bh, cursor: 'nwse-resize' },
        ]

        selectionEl = (
          <>
            <rect
              x={bx}
              y={by}
              width={bw}
              height={bh}
              fill="none"
              stroke="#4a90d9"
              strokeWidth={1}
              strokeDasharray="5 3"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
            {corners.map((c) => (
              <rect
                key={c.key}
                data-resize-handle={c.key}
                x={c.cx - handleSize / 2}
                y={c.cy - handleSize / 2}
                width={handleSize}
                height={handleSize}
                fill="white"
                stroke="#4a90d9"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                style={{ cursor: c.cursor }}
                pointerEvents="auto"
              />
            ))}
          </>
        )
      }
    }
  }

  const marqueeEl = marqueeRect ? (
    <rect
      x={marqueeRect.x}
      y={marqueeRect.y}
      width={marqueeRect.width}
      height={marqueeRect.height}
      fill="rgba(74, 144, 217, 0.1)"
      stroke="#4a90d9"
      strokeWidth={1}
      strokeDasharray="4 2"
      vectorEffect="non-scaling-stroke"
      pointerEvents="none"
    />
  ) : null

  if (!selectionEl && !marqueeEl) return null

  return (
    <g>
      {selectionEl}
      {marqueeEl}
    </g>
  )
}
