import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  setAuth: (session: Session | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  setAuth: (session) =>
    set({ user: session?.user ?? null, session, loading: false }),
  setLoading: (loading) => set({ loading }),
}))
