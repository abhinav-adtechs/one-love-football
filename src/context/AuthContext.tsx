import { createContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  loading: boolean
  isNewUser: boolean
  signInWithOtp: (phone: string) => Promise<{ error: Error | null }>
  verifyOtp: (phone: string, token: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      setProfile(data as Profile | null)
    } catch {
      // If profile fetch fails, leave profile as null — auth loading will still resolve
    }
  }, [])

  useEffect(() => {
    let initialized = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Keep this callback synchronous — calling supabase APIs here can deadlock
        setSession(session)
        if (!session?.user) setProfile(null)
        if (!initialized) {
          initialized = true
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Fetch profile whenever session changes (outside the auth lock)
  useEffect(() => {
    if (session?.user) {
      fetchProfile(session.user.id)
    }
  }, [session, fetchProfile])

  const isNewUser = profile?.display_name === 'Player'

  const signInWithOtp = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({ phone })
    return { error: error as Error | null }
  }

  const verifyOtp = async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  const refreshProfile = async () => {
    if (session?.user) {
      await fetchProfile(session.user.id)
    }
  }

  return (
    <AuthContext.Provider value={{
      session, profile, loading, isNewUser,
      signInWithOtp, verifyOtp, signOut, refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}
