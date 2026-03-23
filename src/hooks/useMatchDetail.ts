import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { normalizePhone } from '../lib/parseWhatsApp'
import type { Match, MatchBilling, MatchRoster, PlayerMatchPayment, VenuePayment, PaymentMethod } from '../types'

export interface RosterEntry extends MatchRoster {
  amount_collected: number
  paid_at: string | null
  profiles?: { display_name: string; phone: string } | null
}

export interface TurfPaymentInput {
  amount: number
  method: PaymentMethod | null
  notes: string
  paid_by: string
}

export function useMatchDetail(matchId: string) {
  const [match, setMatch] = useState<Match | null>(null)
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [billing, setBilling] = useState<MatchBilling | null>(null)
  const [turfPayments, setTurfPayments] = useState<VenuePayment[]>([])
  const [payments, setPayments] = useState<PlayerMatchPayment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const [matchRes, rosterRes, billingRes, turfRes, paymentsRes] = await Promise.all([
        supabase.from('matches').select('*').eq('id', matchId).single(),
        supabase
          .from('match_roster')
          .select('*, profiles(display_name, phone)')
          .eq('match_id', matchId)
          .in('status', ['confirmed', 'late_arrival', 'waitlisted'])
          .order('created_at'),
        supabase.from('match_billing').select('*').eq('match_id', matchId).maybeSingle(),
        supabase.from('venue_payments').select('*').eq('match_id', matchId).order('created_at'),
        supabase.from('player_match_payments').select('*').eq('match_id', matchId),
      ])
      setMatch(matchRes.data as Match | null)
      setRoster((rosterRes.data ?? []) as RosterEntry[])
      setBilling(billingRes.data as MatchBilling | null)
      setTurfPayments((turfRes.data ?? []) as VenuePayment[])
      setPayments((paymentsRes.data ?? []) as PlayerMatchPayment[])
    } finally {
      setLoading(false)
    }
  }, [matchId])

  useEffect(() => { fetchAll() }, [fetchAll])

  const markCashCollected = async (rosterEntryId: string, amount: number) => {
    const { error } = await supabase
      .from('match_roster')
      .update({ amount_collected: amount, paid_at: new Date().toISOString() })
      .eq('id', rosterEntryId)
    if (!error) await fetchAll(false)
    return { error }
  }

  const undoCollected = async (rosterEntryId: string) => {
    const { error } = await supabase
      .from('match_roster')
      .update({ amount_collected: 0, paid_at: null })
      .eq('id', rosterEntryId)
    if (!error) await fetchAll(false)
    return { error }
  }

  // Look up a profile by phone, return profile_id or null
  const lookupProfile = async (phone: string): Promise<string | null> => {
    const phone10 = normalizePhone(phone)
    if (!phone10) return null
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', '91' + phone10)
      .maybeSingle()
    return data?.id ?? null
  }

  const addRosterPlayer = async (input: {
    name: string
    phone: string
    team?: string
    invitedBy: string
  }) => {
    const profileId = await lookupProfile(input.phone)
    const phone10 = normalizePhone(input.phone)
    const { error } = await supabase.from('match_roster').insert({
      match_id: matchId,
      profile_id: profileId,
      guest_name: profileId ? null : (input.name.trim() || 'Guest'),
      guest_phone: profileId ? null : (phone10 ?? (input.phone.trim() || null)),
      source: profileId ? 'community' : 'external',
      status: 'confirmed',
      invited_by: input.invitedBy,
      team: input.team?.trim() || null,
      amount_collected: 0,
    })
    if (!error) await fetchAll(false)
    return { error, profileId }
  }

  const addTeamPlayers = async (teamName: string, players: Array<{ name: string; phone: string }>, invitedBy: string) => {
    const rows = await Promise.all(players.map(async p => {
      const profileId = await lookupProfile(p.phone)
      const phone10 = normalizePhone(p.phone)
      return {
        match_id: matchId,
        profile_id: profileId,
        guest_name: profileId ? null : (p.name.trim() || 'Guest'),
        guest_phone: profileId ? null : (phone10 ?? (p.phone.trim() || null)),
        source: profileId ? 'community' : 'external',
        status: 'confirmed',
        invited_by: invitedBy,
        team: teamName.trim(),
        amount_collected: 0,
      }
    }))
    const { error } = await supabase.from('match_roster').insert(rows)
    if (!error) await fetchAll(false)
    return { error }
  }

  const markTeamPaid = async (team: string, amountPerPlayer: number) => {
    const ids = roster
      .filter(r => r.team === team && (r.amount_collected ?? 0) === 0 && r.status === 'confirmed')
      .map(r => r.id)
    if (!ids.length) return { error: null }
    const { error } = await supabase
      .from('match_roster')
      .update({ amount_collected: amountPerPlayer, paid_at: new Date().toISOString() })
      .in('id', ids)
    if (!error) await fetchAll(false)
    return { error }
  }

  const addTurfPayment = async (input: TurfPaymentInput) => {
    const { error } = await supabase.from('venue_payments').insert({
      match_id: matchId,
      venue_id: match?.venue_id ?? null,
      paid_by: input.paid_by,
      amount: input.amount,
      method: input.method,
      notes: input.notes || null,
    })
    if (!error) await fetchAll(false)
    return { error }
  }

  const totalTurfPaid = turfPayments.reduce((s, p) => s + p.amount, 0)
  const turfDue = billing?.turf_booking_cost ?? 0
  const turfBalance = turfDue - totalTurfPaid

  const totalCashCollected = roster.reduce((s, r) => s + (r.amount_collected ?? 0), 0)

  return {
    match,
    roster,
    billing,
    turfPayments,
    payments,
    loading,
    markCashCollected,
    undoCollected,
    addTurfPayment,
    addRosterPlayer,
    addTeamPlayers,
    markTeamPaid,
    lookupProfile,
    totalTurfPaid,
    turfDue,
    turfBalance,
    totalCashCollected,
    refetch: fetchAll,
  }
}
