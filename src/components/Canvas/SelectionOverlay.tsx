import { useStore } from '../../store/useStore'

export function SelectionOverlay() {
  const selectedIds = useStore((s) => s.selectedIds)
  const objects = useStore((s) => s.objects)

  if (selectedIds.size === 0) return null

  const selected = objects.filter((o) => selectedIds.has(o.id))
  if (selected.length === 0) return null

  const padding = 8

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

  return (
    <rect
      x={minX - padding}
      y={minY - padding}
      width={maxX - minX + padding * 2}
      height={maxY - minY + padding * 2}
      fill="none"
      stroke="#4a90d9"
      strokeWidth={1}
      strokeDasharray="5 3"
      vectorEffect="non-scaling-stroke"
      pointerEvents="none"
    />
  )
}
