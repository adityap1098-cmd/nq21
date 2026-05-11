import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Derive project ref from URL (e.g. "nmbgprrueuxvrqrmmvmo") for stable storageKey
const projectRef = SUPABASE_URL.split('//')[1]?.split('.')[0] ?? 'nq21'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: `sb-${projectRef}-auth-token`,
  },
})
