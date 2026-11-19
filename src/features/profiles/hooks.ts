import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Profile {
  id: string
  name: string
  role: 'owner' | 'kasir'
  is_active: boolean
  created_at: string
}

/** All login accounts. RLS returns every row to an owner and only their own row to a kasir. */
export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role, is_active, created_at')
        .order('role')
        .order('name')
      if (error) throw error
      return data as Profile[]
    },
  })
}
