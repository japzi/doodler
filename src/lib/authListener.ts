import { supabase } from './supabase'
import { useAuthStore } from '../store/useAuthStore'

export function initAuthListener() {
  supabase.auth.getSession().then(({ data: { session } }) => {
    useAuthStore.getState().setAuth(session)
  })

  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setAuth(session)
  })
}
