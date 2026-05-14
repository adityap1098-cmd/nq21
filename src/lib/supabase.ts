import { createClient } from '@supabase/supabase-js'
import { processLock } from '@supabase/auth-js'

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
    // Bypass cross-tab LockManager contention. Without this, Tab B's getSession()
    // hangs waiting for Tab A's autoRefresh token tick to release navigator.locks.
    lock: processLock,
  },
})
