import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { loadAllPresetFonts } from './fonts/fontRegistry'
import { initAuthListener } from './lib/authListener'
import App from './App'

loadAllPresetFonts()
initAuthListener()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
