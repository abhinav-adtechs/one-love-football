import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatPaise } from '../lib/currency'
import RoleGate from '../components/RoleGate'
import type { LedgerEntry, PaymentMethod } from '../types'

interface PendingEntry extends LedgerEntry {
  profiles?: { display_name: string; phone: string }
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  google_pay: 'Google Pay',
  phonepe: 'PhonePe',
  upi_id: 'UPI ID',
  bank_transfer: 'Bank Transfer',
  other: 'Other',
}

export default function PaymentApprovalPage() {
  return (
    <RoleGate allowed={['host', 'admin']}>
      <ApprovalContent />
    </RoleGate>
  )
}

function ApprovalContent() {
  const { session } = useAuth()
  const [pending, setPending] = useState<PendingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [actioningId, setActioningId] = useState<string | null>(null)

  // Cash payment form
  const [showCashForm, setShowCashForm] = useState(false)
  const [cashPlayer, setCashPlayer] = useState('')
  const [cashAmount, setCashAmount] = useState('')
  const [cashError, setCashError] = useState('')
  const [players, setPlayers] = useState<{ id: string; display_name: string; phone: string }[]>([])

  const fetchPending = useCallback(async () => {
    const { data } = await supabase
      .from('ledger')
      .select('*, profiles(display_name, phone)')
      .eq('approval_status', 'pending_approval')
      .order('created_at', { ascending: true })

    setPending((data ?? []) as PendingEntry[])
    setLoading(false)
  }, [])

  const fetchPlayers = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, phone')
      .order('display_name')
    setPlayers((data ?? []) as { id: string; display_name: string; phone: string }[])
  }, [])

  useEffect(() => {
    fetchPending()
    fetchPlayers()
  }, [fetchPending, fetchPlayers])

  const handleAction = async (entryId: string, action: 'approved' | 'rejected', entry: PendingEntry) => {
    setActioningId(entryId)

    await supabase.from('ledger').update({
      approval_status: action,
      approved_by: session!.user.id,
      approved_at: new Date().toISOString(),
    }).eq('id', entryId)

    // Create notification for the player
    await supabase.from('notifications').insert({
      profile_id: entry.profile_id,
      type: action === 'approved' ? 'payment_approved' : 'payment_rejected',
      title: action === 'approved' ? 'Payment Approved' : 'Payment Rejected',
      body: `Your ${formatPaise(entry.amount)} payment has been ${action}.`,
      ledger_id: entryId,
    })

    setActioningId(null)
    fetchPending()
  }

  const handleCashPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setCashError('')

    if (!cashPlayer || !cashAmount) {
      setCashError('Select a player and enter amount')
      return
    }

    const paise = Math.round(parseFloat(cashAmount) * 100)
    if (paise <= 0) {
      setCashError('Enter a valid amount')
      return
    }

    const { error } = await supabase.from('ledger').insert({
      profile_id: cashPlayer,
      entry_type: 'topup',
      amount: paise,
      method: 'cash' as PaymentMethod,
      approval_status: 'approved',
      submitted_by: session!.user.id,
      approved_by: session!.user.id,
      approved_at: new Date().toISOString(),
    })

    if (error) {
      setCashError(error.message)
      return
    }

    // Notify the player
    await supabase.from('notifications').insert({
      profile_id: cashPlayer,
      type: 'payment_approved',
      title: 'Cash Payment Recorded',
      body: `₹${cashAmount} cash payment has been recorded.`,
    })

    setCashPlayer('')
    setCashAmount('')
    setShowCashForm(false)
  }

  const getProofUrl = (path: string) => {
    const { data } = supabase.storage.from('payment-proofs').getPublicUrl(path)
    return data.publicUrl
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ margin: 0 }}>Payment Approvals</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowCashForm(!showCashForm)}>
          {showCashForm ? 'Cancel' : 'Record Cash'}
        </button>
      </div>

      {/* Cash Payment Form */}
      {showCashForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>Record Cash Payment</h3>
          <form onSubmit={handleCashPayment}>
            <div className="form-group">
              <label htmlFor="cash-player">Player</label>
              <select id="cash-player" value={cashPlayer} onChange={e => setCashPlayer(e.target.value)}>
                <option value="">Select player</option>
                {players.map(p => (
                  <option key={p.id} value={p.id}>{p.display_name} ({p.phone})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="cash-amount">Amount (₹)</label>
              <input
                id="cash-amount"
                type="number"
                placeholder="300"
                value={cashAmount}
                onChange={e => setCashAmount(e.target.value)}
                min={1}
              />
            </div>
            {cashError && <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: '0 0 12px' }}>{cashError}</p>}
            <button type="submit" className="btn btn-success btn-block">Record Cash Payment</button>
          </form>
        </div>
      )}

      {/* Pending Approvals */}
      {pending.length === 0 ? (
        <div className="card text-center">
          <p className="subtle">No pending approvals</p>
        </div>
      ) : (
        pending.map(entry => (
          <div key={entry.id} className="card" style={{ marginBottom: 12 }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <strong>{entry.profiles?.display_name ?? 'Unknown'}</strong>
                <span className="subtle" style={{ marginLeft: 8, fontSize: '0.85rem' }}>
                  {entry.profiles?.phone}
                </span>
              </div>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#166534' }}>
                +{formatPaise(entry.amount)}
              </span>
            </div>

            <div className="flex items-center gap-3 mb-4" style={{ flexWrap: 'wrap' }}>
              <span className="badge">{METHOD_LABELS[entry.method ?? ''] ?? entry.method}</span>
              {entry.transaction_ref && (
                <span className="subtle" style={{ fontSize: '0.85rem' }}>Ref: {entry.transaction_ref}</span>
              )}
              <span className="subtle" style={{ fontSize: '0.85rem' }}>
                {new Date(entry.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {entry.proof_url && (
              <div style={{ marginBottom: 12 }}>
                <a href={getProofUrl(entry.proof_url)} target="_blank" rel="noopener noreferrer">
                  <img
                    src={getProofUrl(entry.proof_url)}
                    alt="Payment proof"
                    style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                </a>
              </div>
            )}

            <div className="flex gap-3">
              <button
                className="btn btn-success btn-sm"
                style={{ flex: 1 }}
                disabled={actioningId === entry.id}
                onClick={() => handleAction(entry.id, 'approved', entry)}
              >
                Approve
              </button>
              <button
                className="btn btn-danger btn-sm"
                style={{ flex: 1 }}
                disabled={actioningId === entry.id}
                onClick={() => handleAction(entry.id, 'rejected', entry)}
              >
                Reject
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
