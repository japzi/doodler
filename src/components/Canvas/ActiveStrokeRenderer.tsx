import { useStore } from '../../store/useStore'
import { generateStrokePathData } from '../../rendering/sketchyPath'

export function ActiveStrokeRenderer() {
  const activeStrokePoints = useStore((s) => s.activeStrokePoints)
  const strokeColor = useStore((s) => s.strokeColor)

  if (!activeStrokePoints || activeStrokePoints.length < 2) return null

  const pathData = generateStrokePathData(activeStrokePoints)

  return <path d={pathData} fill={strokeColor} />
}
