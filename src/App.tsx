import './App.css'
import { Canvas } from './components/Canvas/Canvas'
import { Toolbar } from './components/Toolbar/Toolbar'
import { ZoomControls } from './components/ZoomControls/ZoomControls'

function App() {
  return (
    <div className="app">
      <Canvas />
      <Toolbar />
      <ZoomControls />
    </div>
  )
}

export default App
