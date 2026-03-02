import { memo } from 'react'
import { useStore } from '../../store/useStore'
import type { SceneObject } from '../../types/scene'

const SceneObjectElement = memo(function SceneObjectElement({ obj }: { obj: SceneObject }) {
  const isShape = obj.type !== 'pen'

  return (
    <path
      d={obj.pathData}
      fill={isShape ? 'none' : obj.color}
      stroke={isShape ? obj.color : undefined}
      strokeWidth={isShape ? 2 : undefined}
      transform={`translate(${obj.position.x}, ${obj.position.y})`}
      data-object-id={obj.id}
      style={{ cursor: 'default' }}
    />
  )
})

export function SceneRenderer() {
  const objects = useStore((s) => s.objects)

  return (
    <g>
      {objects.map((obj) => (
        <SceneObjectElement key={obj.id} obj={obj} />
      ))}
    </g>
  )
}
