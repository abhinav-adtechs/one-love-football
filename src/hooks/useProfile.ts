import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { PlayerPosition } from '../types'

interface ProfileUpdateData {
  display_name: string
  jersey_number?: number | null
  default_positions?: PlayerPosition[]
}

export function useProfile() {
  const { session, refreshProfile } = useAuth()

  const updateProfile = async (data: ProfileUpdateData) => {
    if (!session?.user) return { error: new Error('Not authenticated') }

    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', session.user.id)

    if (!error) {
      await refreshProfile()
    }

    return { error }
  }

  return { updateProfile }
}
