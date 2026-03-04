import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { loadAllPresetFonts } from './fonts/fontRegistry'
import App from './App'

loadAllPresetFonts()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
