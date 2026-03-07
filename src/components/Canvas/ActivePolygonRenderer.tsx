import { useEffect, useState } from 'react'
import { useStore } from '../../store/useStore'
import type { Point } from '../../types/scene'

export function ActivePolygonRenderer({ cursorPos }: { cursorPos: React.RefObject<Point | null> }) {
  const points = useStore((s) => s.activePolygonPoints)
  const viewport = useStore((s) => s.viewport)
  const strokeColor = useStore((s) => s.strokeColor)
  const [cursor, setCursor] = useState<Point | null>(null)

  // Poll cursor position via requestAnimationFrame for smooth preview
  useEffect(() => {
    if (!points || points.length === 0) return
    let raf: number
    const tick = () => {
      setCursor(cursorPos.current ? { ...cursorPos.current } : null)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [points, cursorPos])

  if (!points || points.length === 0) return null

  const r = 4 / viewport.scale
  const strokeW = 1.5 / viewport.scale
  const dashArray = `${6 / viewport.scale} ${4 / viewport.scale}`

  // Build polyline of placed vertices
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ')
  const lastPoint = points[points.length - 1]
  const firstPoint = points[0]

  return (
    <g>
      {/* Lines connecting placed vertices */}
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeW}
        strokeDasharray={dashArray}
        pointerEvents="none"
      />

      {/* Line from last vertex to cursor */}
      {cursor && (
        <line
          x1={lastPoint.x} y1={lastPoint.y}
          x2={cursor.x} y2={cursor.y}
          stroke={strokeColor}
          strokeWidth={strokeW}
          strokeDasharray={dashArray}
          pointerEvents="none"
        />
      )}

      {/* Close preview: dashed line from cursor to first vertex */}
      {cursor && points.length >= 2 && (
        <line
          x1={cursor.x} y1={cursor.y}
          x2={firstPoint.x} y2={firstPoint.y}
          stroke={strokeColor}
          strokeWidth={strokeW}
          strokeDasharray={dashArray}
          opacity={0.4}
          pointerEvents="none"
        />
      )}

      {/* Vertex dots */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x} cy={p.y} r={r}
          fill="white"
          stroke={strokeColor}
          strokeWidth={strokeW}
          pointerEvents="none"
        />
      ))}
    </g>
  )
}
