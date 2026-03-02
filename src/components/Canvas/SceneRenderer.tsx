import { memo } from 'react'
import { useStore } from '../../store/useStore'
import type { SceneObject } from '../../types/scene'

const SceneObjectElement = memo(function SceneObjectElement({ obj }: { obj: SceneObject }) {
  return (
    <path
      d={obj.pathData}
      fill={obj.color}
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
