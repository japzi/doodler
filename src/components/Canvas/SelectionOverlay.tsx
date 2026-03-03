import { useStore } from '../../store/useStore'

export function SelectionOverlay() {
  const selectedIds = useStore((s) => s.selectedIds)
  const objects = useStore((s) => s.objects)
  const marqueeRect = useStore((s) => s.marqueeRect)
  const viewport = useStore((s) => s.viewport)

  const padding = 8
  const handleSize = 8 / viewport.scale

  let selectionEl: React.ReactNode = null

  if (selectedIds.size > 0) {
    const selected = objects.filter((o) => selectedIds.has(o.id))
    if (selected.length > 0) {
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
