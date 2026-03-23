import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile, PlayerPosition } from '../types'

export interface MemberStats {
  matchesPlayed: number
  goals: number
  assists: number
  motmCount: number
}

export interface CommunityMember extends Profile {
  stats: MemberStats
}

export function useCommunity() {
  const [members, setMembers] = useState<CommunityMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchMembers = useCallback(async () => {
    setLoading(true)

    const [profilesRes, rosterRes, statsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('display_name'),
      supabase
        .from('match_roster')
        .select('profile_id, status')
        .not('profile_id', 'is', null)
        .in('status', ['confirmed', 'late_arrival', 'no_show']),
      supabase
        .from('game_player_stats')
        .select('profile_id, goals, assists, is_motm'),
    ])

    const profiles = (profilesRes.data ?? []) as Profile[]
    const rosterRows = (rosterRes.data ?? []) as { profile_id: string; status: string }[]
    const statRows = (statsRes.data ?? []) as {
      profile_id: string
      goals: number
      assists: number
      is_motm: boolean
    }[]

    // Aggregate match counts
    const matchCounts: Record<string, number> = {}
    for (const row of rosterRows) {
      matchCounts[row.profile_id] = (matchCounts[row.profile_id] ?? 0) + 1
    }

    // Aggregate game stats
    const gameStats: Record<string, { goals: number; assists: number; motm: number }> = {}
    for (const row of statRows) {
      if (!gameStats[row.profile_id]) {
        gameStats[row.profile_id] = { goals: 0, assists: 0, motm: 0 }
      }
      gameStats[row.profile_id].goals += row.goals
      gameStats[row.profile_id].assists += row.assists
      if (row.is_motm) gameStats[row.profile_id].motm += 1
    }

    const enriched: CommunityMember[] = profiles.map(p => ({
      ...p,
      stats: {
        matchesPlayed: matchCounts[p.id] ?? 0,
        goals: gameStats[p.id]?.goals ?? 0,
        assists: gameStats[p.id]?.assists ?? 0,
        motmCount: gameStats[p.id]?.motm ?? 0,
      },
    }))

    setMembers(enriched)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const updateMember = useCallback(
    async (
      id: string,
      updates: {
        display_name?: string
        jersey_number?: number | null
        default_positions?: PlayerPosition[]
        role?: Profile['role']
        is_banned?: boolean
        ban_reason?: string | null
      }
    ) => {
      setSaving(true)
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
      setSaving(false)
      if (error) throw error
      await fetchMembers()
    },
    [fetchMembers]
  )

  return { members, loading, saving, refetch: fetchMembers, updateMember }
}
