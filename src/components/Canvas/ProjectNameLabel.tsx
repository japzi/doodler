import { useStore } from '../../store/useStore'
import './ProjectNameLabel.css'

export function ProjectNameLabel() {
  const projectName = useStore((s) => s.projectName)
  const setProjectName = useStore((s) => s.setProjectName)

  const handleClick = () => {
    const name = window.prompt('Rename project:', projectName)
    if (name !== null && name.trim() !== '') {
      setProjectName(name.trim())
    }
  }

  return (
    <button className="project-name-label" onClick={handleClick} title="Rename project">
      {projectName}
    </button>
  )
}
