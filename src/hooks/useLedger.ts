import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { LedgerEntry, PaymentMethod } from '../types'

const BLOCK_THRESHOLD_PAISE = -30000 // -₹300

export function useLedger(profileId?: string) {
  const { session } = useAuth()
  const userId = profileId ?? session?.user?.id
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLedger = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('ledger')
      .select('*')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    const ledgerEntries = (data ?? []) as LedgerEntry[]
    setEntries(ledgerEntries)

    // Calculate balance from approved entries only
    const approvedBalance = ledgerEntries
      .filter(e => e.approval_status === 'approved')
      .reduce((sum, e) => sum + e.amount, 0)
    setBalance(approvedBalance)

    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchLedger()
  }, [fetchLedger])

  const isBlocked = balance < BLOCK_THRESHOLD_PAISE

  const submitTopup = async (
    amountPaise: number,
    method: PaymentMethod,
    proofFile?: File
  ) => {
    if (!session?.user) return { error: 'Not authenticated' }

    let proofUrl: string | null = null

    if (proofFile) {
      const ext = proofFile.name.split('.').pop() ?? 'jpg'
      const path = `${session.user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(path, proofFile)

      if (uploadError) return { error: uploadError.message }
      proofUrl = path
    }

    const { error: insertError } = await supabase.from('ledger').insert({
      profile_id: session.user.id,
      entry_type: 'topup',
      amount: amountPaise,
      method,
      proof_url: proofUrl,
      approval_status: 'pending_approval',
      submitted_by: session.user.id,
    })

    if (insertError) return { error: insertError.message }

    await fetchLedger()
    return { error: null }
  }

  return { entries, balance, isBlocked, loading, error, submitTopup, refetch: fetchLedger }
}

// Lightweight hook just for balance check
export function useBalanceCheck() {
  const { balance, isBlocked, loading } = useLedger()
  return { balance, isBlocked, loading }
}
