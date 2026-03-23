import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useMatchBilling } from '../hooks/useMatchBilling'
import { formatPaise, rupeesToPaise } from '../lib/currency'
import RoleGate from '../components/RoleGate'

export default function MatchBillingPage() {
  return (
    <RoleGate allowed={['host', 'admin']}>
      <BillingContent />
    </RoleGate>
  )
}

function BillingContent() {
  const { matchId } = useParams<{ matchId: string }>()
  const { session } = useAuth()
  const { billing, roster, payments, loading, saveBilling, markPlayersToPay } = useMatchBilling(matchId!)

  const [turfCost, setTurfCost] = useState('')
  const [additional, setAdditional] = useState('')
  const [additionalNote, setAdditionalNote] = useState('')
  const [roundOff, setRoundOff] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set())

  // Initialize form when billing loads
  useMemo(() => {
    if (billing) {
      setTurfCost((billing.turf_booking_cost / 100).toString())
      setAdditional((billing.additional_charges / 100).toString())
      setAdditionalNote(billing.additional_charges_note ?? '')
      setRoundOff((billing.round_off / 100).toString())
    }
  }, [billing])

  const confirmedPlayers = roster.filter(r => r.profile_id)
  const playerCount = confirmedPlayers.length || 1

  const turfCostPaise = rupeesToPaise(parseFloat(turfCost) || 0)
  const additionalPaise = rupeesToPaise(parseFloat(additional) || 0)
  const roundOffPaise = rupeesToPaise(parseFloat(roundOff) || 0)
  const perPlayerShare = Math.ceil((turfCostPaise + additionalPaise + roundOffPaise) / playerCount)
  const totalTarget = perPlayerShare * playerCount

  // Players already marked to pay
  const alreadyMarked = new Set(payments.map(p => p.profile_id))

  const togglePlayer = (id: string) => {
    setSelectedPlayers(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllUnmarked = () => {
    const unmarked = confirmedPlayers
      .filter(r => r.profile_id && !alreadyMarked.has(r.profile_id))
      .map(r => r.profile_id!)
    setSelectedPlayers(new Set(unmarked))
  }

  const handleSaveBilling = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const { error: saveError } = await saveBilling({
      turf_booking_cost: turfCostPaise,
      per_player_share: perPlayerShare,
      round_off: roundOffPaise,
      additional_charges: additionalPaise,
      additional_charges_note: additionalNote,
      total_collected_target: totalTarget,
      created_by: session!.user.id,
    })

    setSaving(false)
    if (saveError) setError(saveError.message)
  }

  const handleMarkToPay = async () => {
    if (selectedPlayers.size === 0) return
    setError('')
    setSaving(true)

    const { error: markError } = await markPlayersToPay(
      Array.from(selectedPlayers),
      perPlayerShare,
      session!.user.id
    )

    setSaving(false)
    if (markError) setError(markError.message)
    else setSelectedPlayers(new Set())
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Match Billing</h2>

      {/* Billing Form */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Cost Breakdown</h3>
        <form onSubmit={handleSaveBilling}>
          <div className="form-group">
            <label htmlFor="turf-cost">Turf Booking Cost (₹)</label>
            <input
              id="turf-cost"
              type="number"
              placeholder="3000"
              value={turfCost}
              onChange={e => setTurfCost(e.target.value)}
              min={0}
            />
          </div>

          <div className="form-group">
            <label htmlFor="additional">Additional Charges (₹)</label>
            <input
              id="additional"
              type="number"
              placeholder="0"
              value={additional}
              onChange={e => setAdditional(e.target.value)}
              min={0}
            />
          </div>

          {(parseFloat(additional) > 0) && (
            <div className="form-group">
              <label htmlFor="additional-note">Reason for Additional Charges</label>
              <input
                id="additional-note"
                type="text"
                placeholder="e.g., Bibs, water bottles"
                value={additionalNote}
                onChange={e => setAdditionalNote(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="round-off">Round-Off Adjustment (₹)</label>
            <input
              id="round-off"
              type="number"
              placeholder="0"
              value={roundOff}
              onChange={e => setRoundOff(e.target.value)}
            />
          </div>

          {/* Summary */}
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div className="flex justify-between mb-4">
              <span className="subtle">Players in roster</span>
              <strong>{playerCount}</strong>
            </div>
            <div className="flex justify-between mb-4">
              <span className="subtle">Per player share</span>
              <strong>{formatPaise(perPlayerShare)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="subtle">Total to collect</span>
              <strong>{formatPaise(totalTarget)}</strong>
            </div>
          </div>

          {error && <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: '0 0 12px' }}>{error}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {saving ? 'Saving...' : billing ? 'Update Billing' : 'Save Billing'}
          </button>
        </form>
      </div>

      {/* Mark Players to Pay */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ margin: 0 }}>Mark Players to Pay</h3>
          <button className="btn btn-ghost btn-sm" onClick={selectAllUnmarked}>
            Select All
          </button>
        </div>

        {confirmedPlayers.length === 0 ? (
          <p className="subtle text-center">No players in roster</p>
        ) : (
          <>
            {confirmedPlayers.map(r => {
              if (!r.profile_id) return null
              const isMarked = alreadyMarked.has(r.profile_id)
              const isSelected = selectedPlayers.has(r.profile_id)
              const payment = payments.find(p => p.profile_id === r.profile_id)

              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between"
                  style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}
                >
                  <div className="flex items-center gap-3">
                    {!isMarked && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => togglePlayer(r.profile_id!)}
                        style={{ width: 18, height: 18 }}
                      />
                    )}
                    <span>{r.profiles?.display_name ?? 'Guest'}</span>
                  </div>
                  {isMarked ? (
                    <span className={`badge ${payment?.status === 'paid' ? 'badge-paid' : 'badge-pending'}`}>
                      {payment?.status === 'paid' ? 'Paid' : `Due ${formatPaise(payment?.amount_due ?? 0)}`}
                    </span>
                  ) : (
                    <span className="subtle" style={{ fontSize: '0.85rem' }}>{formatPaise(perPlayerShare)}</span>
                  )}
                </div>
              )
            })}

            {selectedPlayers.size > 0 && (
              <button
                className="btn btn-success btn-block mt-4"
                onClick={handleMarkToPay}
                disabled={saving}
              >
                Mark {selectedPlayers.size} Player{selectedPlayers.size > 1 ? 's' : ''} to Pay ({formatPaise(perPlayerShare)} each)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
