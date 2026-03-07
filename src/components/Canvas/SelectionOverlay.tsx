import { useStore } from '../../store/useStore'
import type { ArrowShape, LineShape, PolygonShape } from '../../types/scene'
import { getRotatedBounds } from '../../utils/rotation'

function RotateHandle({ cx, cy, r, scale }: { cx: number; cy: number; r: number; scale: number }) {
  // Small curved arrow icon inside the circle
  const iconR = r * 0.55
  // Arc from ~-135° to ~45° (a 180° sweep)
  const startAngle = -135 * Math.PI / 180
  const endAngle = 45 * Math.PI / 180
  const x1 = cx + iconR * Math.cos(startAngle)
  const y1 = cy + iconR * Math.sin(startAngle)
  const x2 = cx + iconR * Math.cos(endAngle)
  const y2 = cy + iconR * Math.sin(endAngle)
  // Small arrowhead at the end of the arc
  const tipLen = r * 0.4
  const a1 = endAngle - Math.PI * 0.75
  const a2 = endAngle - Math.PI * 0.15
  const ax1 = x2 + tipLen * Math.cos(a1)
  const ay1 = y2 + tipLen * Math.sin(a1)
  const ax2 = x2 + tipLen * Math.cos(a2)
  const ay2 = y2 + tipLen * Math.sin(a2)

  return (
    <g data-rotate-handle="rotate" style={{ cursor: 'grab' }} pointerEvents="auto">
      <circle
        cx={cx} cy={cy} r={r}
        fill="white" stroke="#4a90d9" strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={`M ${x1} ${y1} A ${iconR} ${iconR} 0 1 1 ${x2} ${y2}`}
        fill="none" stroke="#4a90d9" strokeWidth={1.2 / scale}
        strokeLinecap="round"
      />
      <polyline
        points={`${ax1},${ay1} ${x2},${y2} ${ax2},${ay2}`}
        fill="none" stroke="#4a90d9" strokeWidth={1.2 / scale}
        strokeLinecap="round" strokeLinejoin="round"
      />
    </g>
  )
}

export function SelectionOverlay() {
  const selectedIds = useStore((s) => s.selectedIds)
  const objects = useStore((s) => s.objects)
  const marqueeRect = useStore((s) => s.marqueeRect)
  const viewport = useStore((s) => s.viewport)
  const editingTextId = useStore((s) => s.editingTextId)
  const selectedPolygonVertex = useStore((s) => s.selectedPolygonVertex)

  const padding = 8
  const handleSize = 8 / viewport.scale
  const handleRadius = 5 / viewport.scale

  let selectionEl: React.ReactNode = null

  if (selectedIds.size > 0 && !editingTextId) {
    const selected = objects.filter((o) => selectedIds.has(o.id))
    if (selected.length > 0) {
      const isSingleArrow = selected.length === 1 && selected[0].type === 'arrow'
      const isSingleLine = selected.length === 1 && selected[0].type === 'line'
      const isSinglePolygon = selected.length === 1 && selected[0].type === 'polygon'

      if (isSinglePolygon) {
        const obj = selected[0] as PolygonShape
        const ox = obj.position.x
        const oy = obj.position.y
        const midHandleRadius = 3.5 / viewport.scale
        const deleteSize = 14 / viewport.scale
        const polyRotation = obj.rotation ?? 0

        // Compute polygon bounding box for rotation handle placement
        const bb = obj.boundingBox
        const polyMinY = oy + bb.y
        const polyCenterX = ox + bb.x + bb.width / 2
        const stemLength = 20 / viewport.scale
        const rotHandleTopY = polyMinY - padding - stemLength

        const polygonOverlay = (
          <>
            {/* Rotation stem line */}
            <line
              x1={polyCenterX} y1={polyMinY - padding}
              x2={polyCenterX} y2={rotHandleTopY}
              stroke="#4a90d9"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
            {/* Rotation handle */}
            <RotateHandle cx={polyCenterX} cy={rotHandleTopY} r={handleRadius} scale={viewport.scale} />
            {/* Vertex handles */}
            {obj.points.map((p, i) => (
              <circle
                key={`v-${i}`}
                data-polygon-handle={`vertex-${i}`}
                cx={ox + p.x}
                cy={oy + p.y}
                r={handleRadius}
                fill={selectedPolygonVertex === i ? '#4a90d9' : 'white'}
                stroke="#4a90d9"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                style={{ cursor: 'move' }}
                pointerEvents="auto"
              />
            ))}
            {/* Edge midpoint handles */}
            {obj.points.map((p, i) => {
              const next = obj.points[(i + 1) % obj.points.length]
              const mx = ox + (p.x + next.x) / 2
              const my = oy + (p.y + next.y) / 2
              return (
                <circle
                  key={`m-${i}`}
                  data-polygon-handle={`mid-${i}`}
                  cx={mx}
                  cy={my}
                  r={midHandleRadius}
                  fill="#4a90d9"
                  stroke="white"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  style={{ cursor: 'pointer' }}
                  pointerEvents="auto"
                />
              )
            })}
            {/* Delete button for selected vertex */}
            {selectedPolygonVertex !== null && obj.points.length > 3 && (() => {
              const vp = obj.points[selectedPolygonVertex]
              if (!vp) return null
              const bx = ox + vp.x - deleteSize / 2
              const by = oy + vp.y - deleteSize - 4 / viewport.scale
              return (
                <g
                  data-polygon-handle="delete-vertex"
                  style={{ cursor: 'pointer' }}
                  pointerEvents="auto"
                >
                  <rect
                    x={bx} y={by}
                    width={deleteSize} height={deleteSize}
                    rx={2 / viewport.scale}
                    fill="#e74c3c" stroke="none"
                  />
                  <line
                    x1={bx + 3 / viewport.scale} y1={by + 3 / viewport.scale}
                    x2={bx + deleteSize - 3 / viewport.scale} y2={by + deleteSize - 3 / viewport.scale}
                    stroke="white" strokeWidth={1.5 / viewport.scale}
                  />
                  <line
                    x1={bx + deleteSize - 3 / viewport.scale} y1={by + 3 / viewport.scale}
                    x2={bx + 3 / viewport.scale} y2={by + deleteSize - 3 / viewport.scale}
                    stroke="white" strokeWidth={1.5 / viewport.scale}
                  />
                </g>
              )
            })()}
          </>
        )

        if (polyRotation !== 0) {
          const rcx = ox + bb.x + bb.width / 2
          const rcy = oy + bb.y + bb.height / 2
          selectionEl = (
            <g transform={`rotate(${polyRotation}, ${rcx}, ${rcy})`}>
              {polygonOverlay}
            </g>
          )
        } else {
          selectionEl = polygonOverlay
        }
      } else if (isSingleArrow || isSingleLine) {
        const obj = selected[0] as ArrowShape | LineShape
        const ox = obj.position.x
        const oy = obj.position.y
        const p1x = ox + obj.x1
        const p1y = oy + obj.y1
        const p2x = ox + obj.x2
        const p2y = oy + obj.y2
        const isCurved = !!(obj.cp1 && obj.cp2)
        const lineRotation = obj.rotation ?? 0
        // Use data-line-handle for lines, data-arrow-handle for arrows
        const handleAttr = isSingleArrow ? 'data-arrow-handle' : 'data-line-handle'

        // Rotation handle for line/arrow
        const lbb = obj.boundingBox
        const lMinY = oy + lbb.y
        const lCenterX = ox + lbb.x + lbb.width / 2
        const lStemLength = 20 / viewport.scale
        const lRotHandleTopY = lMinY - padding - lStemLength

        const rotationHandle = (
          <>
            <line
              x1={lCenterX} y1={lMinY - padding}
              x2={lCenterX} y2={lRotHandleTopY}
              stroke="#4a90d9"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
            <RotateHandle cx={lCenterX} cy={lRotHandleTopY} r={handleRadius} scale={viewport.scale} />
          </>
        )

        const endpointHandles = (
          <>
            <circle
              {...{ [handleAttr]: 'p1' }}
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
              {...{ [handleAttr]: 'p2' }}
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

        // Arrow-specific: arrowhead size handle
        let headSizeHandle: React.ReactNode = null
        if (isSingleArrow) {
          const arrow = obj as ArrowShape
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

          headSizeHandle = (
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
        }

        let lineOverlay: React.ReactNode
        if (isCurved) {
          const cp1x = ox + obj.cp1!.x
          const cp1y = oy + obj.cp1!.y
          const cp2x = ox + obj.cp2!.x
          const cp2y = oy + obj.cp2!.y

          lineOverlay = (
            <>
              {rotationHandle}
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
                {...{ [handleAttr]: 'cp1' }}
                cx={cp1x} cy={cp1y} r={handleRadius}
                fill="#4a90d9" stroke="white" strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                style={{ cursor: 'move' }}
                pointerEvents="auto"
              />
              <circle
                {...{ [handleAttr]: 'cp2' }}
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
          // Straight — show midpoint indicator
          const mx = (p1x + p2x) / 2
          const my = (p1y + p2y) / 2

          lineOverlay = (
            <>
              {rotationHandle}
              {endpointHandles}
              <circle
                className="arrow-midpoint-indicator"
                {...{ [handleAttr]: 'midpoint' }}
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

        if (lineRotation !== 0) {
          const rcx = ox + lbb.x + lbb.width / 2
          const rcy = oy + lbb.y + lbb.height / 2
          selectionEl = (
            <g transform={`rotate(${lineRotation}, ${rcx}, ${rcy})`}>
              {lineOverlay}
            </g>
          )
        } else {
          selectionEl = lineOverlay
        }
      } else {
        // Multi-selection or non-line/arrow/polygon: bounding box + resize + rotation handle
        const isSingle = selected.length === 1
        const singleRotation = isSingle ? (selected[0].rotation ?? 0) : 0

        // For single selection, use unrotated bounds; for multi, use rotated bounds
        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity

        for (const obj of selected) {
          if (isSingle) {
            const bb = obj.boundingBox
            const ox = obj.position.x
            const oy = obj.position.y
            minX = Math.min(minX, bb.x + ox)
            minY = Math.min(minY, bb.y + oy)
            maxX = Math.max(maxX, bb.x + bb.width + ox)
            maxY = Math.max(maxY, bb.y + bb.height + oy)
          } else {
            const rb = getRotatedBounds(obj)
            minX = Math.min(minX, rb.x)
            minY = Math.min(minY, rb.y)
            maxX = Math.max(maxX, rb.x + rb.width)
            maxY = Math.max(maxY, rb.y + rb.height)
          }
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

        // Rotation handle: stem from top-center going up
        const stemLength = 20 / viewport.scale
        const rotHandleX = bx + bw / 2
        const rotHandleTopY = by - stemLength

        const overlayContent = (
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
            {/* Rotation stem line */}
            <line
              x1={rotHandleX} y1={by}
              x2={rotHandleX} y2={rotHandleTopY}
              stroke="#4a90d9"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
            {/* Rotation handle */}
            <RotateHandle cx={rotHandleX} cy={rotHandleTopY} r={handleRadius} scale={viewport.scale} />
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

        // For single rotated object, wrap in rotation transform so handles match visual rotation
        if (isSingle && singleRotation !== 0) {
          const rcx = bx + bw / 2
          const rcy = by + bh / 2
          selectionEl = (
            <g transform={`rotate(${singleRotation}, ${rcx}, ${rcy})`}>
              {overlayContent}
            </g>
          )
        } else {
          selectionEl = overlayContent
        }
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
