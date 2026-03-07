import './App.css'
import { Canvas } from './components/Canvas/Canvas'
import { Toolbar } from './components/Toolbar/Toolbar'
import { ZoomControls } from './components/ZoomControls/ZoomControls'
import { ProjectNameLabel } from './components/Canvas/ProjectNameLabel'
import { LoginPage } from './components/LoginPage/LoginPage'
import { useAuthStore } from './store/useAuthStore'

function App() {
  const loading = useAuthStore((s) => s.loading)
  const user = useAuthStore((s) => s.user)

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return (
    <div className="app">
      <Canvas />
      <Toolbar />
      <ZoomControls />
      <ProjectNameLabel />
    </div>
  )
}

export default App
