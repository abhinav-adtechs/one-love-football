import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { MatchBilling, MatchRoster, PlayerMatchPayment } from '../types'

interface RosterWithProfile extends MatchRoster {
  profiles?: { display_name: string; phone: string }
}

export function useMatchBilling(matchId: string) {
  const [billing, setBilling] = useState<MatchBilling | null>(null)
  const [roster, setRoster] = useState<RosterWithProfile[]>([])
  const [payments, setPayments] = useState<PlayerMatchPayment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)

    const [billingRes, rosterRes, paymentsRes] = await Promise.all([
      supabase
        .from('match_billing')
        .select('*')
        .eq('match_id', matchId)
        .maybeSingle(),
      supabase
        .from('match_roster')
        .select('*, profiles(display_name, phone)')
        .eq('match_id', matchId)
        .in('status', ['confirmed', 'late_arrival']),
      supabase
        .from('player_match_payments')
        .select('*')
        .eq('match_id', matchId),
    ])

    setBilling(billingRes.data as MatchBilling | null)
    setRoster((rosterRes.data ?? []) as RosterWithProfile[])
    setPayments((paymentsRes.data ?? []) as PlayerMatchPayment[])
    setLoading(false)
  }, [matchId])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const saveBilling = async (data: {
    turf_booking_cost: number
    per_player_share: number
    round_off: number
    additional_charges: number
    additional_charges_note: string
    total_collected_target: number
    created_by: string
  }) => {
    const payload = { match_id: matchId, ...data }

    const { error } = billing
      ? await supabase.from('match_billing').update(payload).eq('id', billing.id)
      : await supabase.from('match_billing').insert(payload)

    if (!error) await fetchAll()
    return { error }
  }

  const markPlayersToPay = async (
    playerIds: string[],
    amountDue: number,
    hostId: string
  ) => {
    // Create player_match_payments
    const paymentRows = playerIds.map(pid => ({
      match_id: matchId,
      profile_id: pid,
      amount_due: amountDue,
      status: 'pending' as const,
      marked_to_pay_by: hostId,
    }))

    const { error: payError } = await supabase
      .from('player_match_payments')
      .upsert(paymentRows, { onConflict: 'match_id,profile_id' })

    if (payError) return { error: payError }

    // Create debit ledger entries (negative amount = player owes)
    const ledgerRows = playerIds.map(pid => ({
      profile_id: pid,
      match_id: matchId,
      entry_type: 'game_fee' as const,
      amount: -amountDue,
      approval_status: 'approved' as const,
      submitted_by: hostId,
      approved_by: hostId,
      approved_at: new Date().toISOString(),
    }))

    const { error: ledgerError } = await supabase.from('ledger').insert(ledgerRows)

    if (!ledgerError) await fetchAll()
    return { error: ledgerError }
  }

  return { billing, roster, payments, loading, saveBilling, markPlayersToPay, refetch: fetchAll }
}
