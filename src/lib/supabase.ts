import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://placeholder'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('MODE', import.meta.env.MODE)
console.log('URL', import.meta.env.VITE_SUPABASE_URL)
console.log('KEY present?', !!import.meta.env.VITE_SUPABASE_ANON_KEY)

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — auth will not work')
}
