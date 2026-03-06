import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { loadAllPresetFonts } from './fonts/fontRegistry'
import { initAuthListener } from './lib/authListener'
import { useAuthStore } from './store/useAuthStore'
import App from './App'

loadAllPresetFonts()

if ((window as any).__E2E_BYPASS_AUTH__) {
  useAuthStore.setState({ user: { id: 'e2e-test-user' } as any, session: null, loading: false })
} else {
  initAuthListener()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
