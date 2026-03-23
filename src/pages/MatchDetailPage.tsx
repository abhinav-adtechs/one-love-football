import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useMatchDetail } from '../hooks/useMatchDetail'
import { formatPaise, rupeesToPaise } from '../lib/currency'
import { normalizePhone } from '../lib/parseWhatsApp'
import type { PaymentMethod } from '../types'

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', google_pay: 'Google Pay', phonepe: 'PhonePe',
  upi_id: 'UPI', bank_transfer: 'Bank Transfer', other: 'Other',
}

export default function MatchDetailPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const { session, profile } = useAuth()
  const isHostOrAdmin = profile?.role === 'host' || profile?.role === 'admin'
  const {
    match, roster, billing, turfPayments, payments, loading,
    markCashCollected, undoCollected, addTurfPayment,
    addRosterPlayer, addTeamPlayers, markTeamPaid, lookupProfile,
    totalTurfPaid, turfDue, turfBalance, totalCashCollected,
  } = useMatchDetail(matchId!)

  const [tab, setTab] = useState<'players' | 'turf'>('players')

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
  }

  if (!match) {
    return <div className="card text-center"><p className="subtle">Match not found</p></div>
  }

  const dateStr = new Date(match.scheduled_date).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'short',
  })

  return (
    <div>
      {/* Match Header */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 style={{ margin: 0 }}>{match.title}</h2>
            <p className="subtle" style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>
              {dateStr}
              {match.start_time ? ` · ${match.start_time.slice(0, 5)}` : ''}
              {match.notes?.startsWith('Venue:') ? ` · ${match.notes.replace('Venue: ', '')}` : ''}
            </p>
          </div>
          <span className={`badge ${match.status === 'confirmed' ? 'badge-approved' : match.status === 'completed' ? '' : 'badge-pending'}`}>
            {match.status.replace('_', ' ')}
          </span>
        </div>

        {/* Summary chips */}
        <div className="flex gap-3" style={{ marginTop: 12, flexWrap: 'wrap' }}>
          <span className="badge">{match.format}</span>
          <span className="badge">{roster.filter(r => r.status === 'confirmed').length} players</span>
          {billing && <span className="badge">{formatPaise(billing.per_player_share)}/player</span>}
          <span className="badge" style={{ background: totalCashCollected > 0 ? '#dcfce7' : '#f1f5f9' }}>
            Collected {formatPaise(totalCashCollected)}
          </span>
        </div>

        {isHostOrAdmin && (
          <div className="flex gap-3" style={{ marginTop: 12 }}>
            <Link to={`/matches/${matchId}/billing`} className="btn btn-ghost btn-sm">
              Billing Setup
            </Link>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
        {(['players', 'turf'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
              background: tab === t ? '#1e3a5f' : '#fff',
              color: tab === t ? '#fff' : '#64748b',
              fontWeight: tab === t ? 600 : 400,
              fontSize: '0.9rem',
            }}
          >
            {t === 'players' ? `Players (${roster.length})` : 'Turf Payments'}
          </button>
        ))}
      </div>

      {tab === 'players' && (
        <PlayersTab
          roster={roster}
          billing={billing}
          payments={payments}
          isHostOrAdmin={isHostOrAdmin}
          hostId={session!.user.id}
          onMarkCollected={markCashCollected}
          onUndo={undoCollected}
          onAddPlayer={addRosterPlayer}
          onAddTeam={addTeamPlayers}
          onMarkTeamPaid={markTeamPaid}
          onLookupProfile={lookupProfile}
        />
      )}

      {tab === 'turf' && (
        <TurfTab
          turfPayments={turfPayments}
          totalTurfPaid={totalTurfPaid}
          turfDue={turfDue}
          turfBalance={turfBalance}
          isHostOrAdmin={isHostOrAdmin}
          hostId={session!.user.id}
          onAddPayment={addTurfPayment}
        />
      )}
    </div>
  )
}

// ─── Players Tab ──────────────────────────────────────────────────────────────

type AddMode = 'none' | 'player' | 'team'

function PlayersTab({
  roster, billing, payments, isHostOrAdmin, hostId,
  onMarkCollected, onUndo, onAddPlayer, onAddTeam, onMarkTeamPaid, onLookupProfile,
}: {
  roster: ReturnType<typeof useMatchDetail>['roster']
  billing: ReturnType<typeof useMatchDetail>['billing']
  payments: ReturnType<typeof useMatchDetail>['payments']
  isHostOrAdmin: boolean
  hostId: string
  onMarkCollected: (id: string, amount: number) => Promise<{ error: any }>
  onUndo: (id: string) => Promise<{ error: any }>
  onAddPlayer: ReturnType<typeof useMatchDetail>['addRosterPlayer']
  onAddTeam: ReturnType<typeof useMatchDetail>['addTeamPlayers']
  onMarkTeamPaid: ReturnType<typeof useMatchDetail>['markTeamPaid']
  onLookupProfile: ReturnType<typeof useMatchDetail>['lookupProfile']
}) {
  const perPlayerShare = billing?.per_player_share ?? 0
  const [collectingId, setCollectingId] = useState<string | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [addMode, setAddMode] = useState<AddMode>('none')

  const handleCollect = async (rosterEntryId: string, amount: number) => {
    setActioningId(rosterEntryId)
    await onMarkCollected(rosterEntryId, amount)
    setActioningId(null)
    setCollectingId(null)
    setCustomAmount('')
  }

  const handleUndo = async (rosterEntryId: string) => {
    setActioningId(rosterEntryId)
    await onUndo(rosterEntryId)
    setActioningId(null)
  }

  // Group roster by team
  const teams = Array.from(new Set(roster.map(r => r.team ?? null).filter(Boolean))) as string[]
  const noTeam = roster.filter(r => !r.team)
  const hasTeams = teams.length > 0

  const existingTeamNames = teams

  const renderPlayerRow = (entry: typeof roster[0]) => {
    const name = entry.profiles?.display_name ?? entry.guest_name ?? 'Guest'
    const phone = entry.profiles?.phone
      ? entry.profiles.phone.slice(-10)
      : entry.guest_phone
    const isPaid = (entry.amount_collected ?? 0) > 0
    const ledgerPayment = payments.find(p => p.profile_id === entry.profile_id)
    const isCollecting = collectingId === entry.id
    const isActioning = actioningId === entry.id
    const isLinked = !!entry.profile_id

    return (
      <div key={entry.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
        <div className="flex items-center justify-between">
          <div>
            <div style={{ fontWeight: 500, fontSize: '0.95rem' }}>
              {name}
              {!isLinked && (
                <span className="subtle" style={{ marginLeft: 6, fontSize: '0.75rem' }}>
                  {entry.source === 'guest_plus_one' ? '+1' : 'unlinked'}
                </span>
              )}
              {isLinked && (
                <span style={{ marginLeft: 6, fontSize: '0.72rem', color: '#166534' }}>✓</span>
              )}
            </div>
            {phone && <div className="subtle" style={{ fontSize: '0.8rem' }}>{phone}</div>}
          </div>

          <div className="flex items-center gap-2">
            {ledgerPayment && (
              <span className={`badge ${ledgerPayment.status === 'paid' ? 'badge-approved' : 'badge-pending'}`}
                style={{ fontSize: '0.73rem' }}>
                {ledgerPayment.status === 'paid' ? 'Ledger ✓' : `Due ${formatPaise(ledgerPayment.amount_due)}`}
              </span>
            )}
            {isPaid ? (
              <div className="flex items-center gap-2">
                <span className="badge badge-approved" style={{ fontSize: '0.75rem' }}>
                  {formatPaise(entry.amount_collected)}
                </span>
                {isHostOrAdmin && (
                  <button className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.73rem', padding: '2px 6px', color: '#94a3b8' }}
                    disabled={isActioning} onClick={() => handleUndo(entry.id)}>
                    Undo
                  </button>
                )}
              </div>
            ) : isHostOrAdmin && (
              <button className="btn btn-success btn-sm" style={{ fontSize: '0.8rem' }}
                disabled={isActioning}
                onClick={() => {
                  if (perPlayerShare > 0) handleCollect(entry.id, perPlayerShare)
                  else { setCollectingId(entry.id); setCustomAmount('') }
                }}>
                {isActioning ? '...' : perPlayerShare > 0 ? `₹${formatPaise(perPlayerShare).replace('₹', '')}` : 'Collect'}
              </button>
            )}
          </div>
        </div>

        {isCollecting && (
          <div className="flex gap-3" style={{ marginTop: 8 }}>
            <input type="number" placeholder="Amount (₹)" value={customAmount}
              onChange={e => setCustomAmount(e.target.value)} autoFocus
              style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            />
            <button className="btn btn-success btn-sm"
              disabled={!customAmount || isActioning}
              onClick={() => handleCollect(entry.id, rupeesToPaise(parseFloat(customAmount)))}>
              Save
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setCollectingId(null)}>Cancel</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {roster.length === 0 && addMode === 'none' && (
        <div className="card text-center" style={{ marginBottom: 12 }}>
          <p className="subtle">No players yet</p>
        </div>
      )}

      {/* Teams */}
      {hasTeams && teams.map(team => {
        const teamRoster = roster.filter(r => r.team === team)
        const unpaidCount = teamRoster.filter(r => (r.amount_collected ?? 0) === 0).length
        return (
          <div key={team} className="card" style={{ marginBottom: 12 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{team}</span>
                <span className="subtle" style={{ marginLeft: 8, fontSize: '0.8rem' }}>
                  {teamRoster.length} players
                </span>
              </div>
              {isHostOrAdmin && unpaidCount > 0 && (
                <button
                  className="btn btn-success btn-sm"
                  style={{ fontSize: '0.8rem' }}
                  onClick={async () => {
                    const amount = perPlayerShare > 0
                      ? perPlayerShare
                      : rupeesToPaise(parseFloat(prompt(`Amount per player (₹) for ${team}:`) ?? '0') || 0)
                    if (amount > 0) await onMarkTeamPaid(team, amount)
                  }}
                >
                  Mark all paid {perPlayerShare > 0 ? `· ${formatPaise(perPlayerShare)}/player` : ''}
                </button>
              )}
            </div>
            {teamRoster.map(renderPlayerRow)}
          </div>
        )
      })}

      {/* No-team players */}
      {noTeam.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          {hasTeams && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#64748b' }}>Individual</span>
            </div>
          )}
          {noTeam.map(renderPlayerRow)}
        </div>
      )}

      {/* Summary */}
      {roster.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="flex justify-between">
            <span className="subtle" style={{ fontSize: '0.88rem' }}>Cash collected</span>
            <strong style={{ color: '#166534' }}>
              {formatPaise(roster.reduce((s, r) => s + (r.amount_collected ?? 0), 0))}
            </strong>
          </div>
          {billing && (
            <div className="flex justify-between" style={{ marginTop: 4 }}>
              <span className="subtle" style={{ fontSize: '0.88rem' }}>Target</span>
              <strong>{formatPaise(billing.total_collected_target)}</strong>
            </div>
          )}
        </div>
      )}

      {/* Add actions */}
      {isHostOrAdmin && addMode === 'none' && (
        <div className="flex gap-3">
          <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setAddMode('player')}>
            + Add Player
          </button>
          <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setAddMode('team')}>
            + Add Team
          </button>
        </div>
      )}

      {isHostOrAdmin && addMode === 'player' && (
        <AddPlayerForm
          existingTeams={existingTeamNames}
          hostId={hostId}
          onAdd={onAddPlayer}
          onLookup={onLookupProfile}
          onClose={() => setAddMode('none')}
        />
      )}

      {isHostOrAdmin && addMode === 'team' && (
        <AddTeamForm
          hostId={hostId}
          onAdd={onAddTeam}
          onLookup={onLookupProfile}
          onClose={() => setAddMode('none')}
        />
      )}
    </div>
  )
}

// ─── Add Player Form ───────────────────────────────────────────────────────────

function AddPlayerForm({
  existingTeams, hostId, onAdd, onLookup, onClose,
}: {
  existingTeams: string[]
  hostId: string
  onAdd: ReturnType<typeof useMatchDetail>['addRosterPlayer']
  onLookup: ReturnType<typeof useMatchDetail>['lookupProfile']
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [team, setTeam] = useState('')
  const [newTeam, setNewTeam] = useState('')
  const [profileFound, setProfileFound] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setProfileFound(null)
    const phone10 = normalizePhone(phone)
    if (!phone10) return
    const t = setTimeout(async () => {
      const id = await onLookup(phone)
      setProfileFound(id !== null)
    }, 500)
    return () => clearTimeout(t)
  }, [phone])

  const handleAdd = async () => {
    const teamValue = team === '__new__' ? newTeam.trim() : team.trim()
    setSaving(true)
    const { error: err } = await onAdd({ name, phone, team: teamValue || undefined, invitedBy: hostId })
    setSaving(false)
    if (err) { setError(err.message) } else { onClose() }
  }

  return (
    <div className="card">
      <h3 style={{ margin: '0 0 12px' }}>Add Player</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Name</label>
          <input placeholder="Player name" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>
            Phone
            {profileFound === true && <span style={{ color: '#166534', marginLeft: 6, fontSize: '0.78rem' }}>✓ Profile found</span>}
            {profileFound === false && <span style={{ color: '#94a3b8', marginLeft: 6, fontSize: '0.78rem' }}>Will add as unlinked</span>}
          </label>
          <input
            placeholder="10-digit mobile"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            inputMode="numeric"
          />
        </div>
      </div>
      <div className="form-group" style={{ marginBottom: 12 }}>
        <label>Team (optional)</label>
        <select value={team} onChange={e => setTeam(e.target.value)}>
          <option value="">No team</option>
          {existingTeams.map(t => <option key={t} value={t}>{t}</option>)}
          <option value="__new__">+ New team…</option>
        </select>
      </div>
      {team === '__new__' && (
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label>New team name</label>
          <input placeholder="Team name" value={newTeam} onChange={e => setNewTeam(e.target.value)} />
        </div>
      )}
      {error && <p style={{ color: '#ef4444', fontSize: '0.88rem', margin: '0 0 10px' }}>{error}</p>}
      <div className="flex gap-3">
        <button className="btn btn-success" style={{ flex: 1 }} disabled={saving || !name.trim()} onClick={handleAdd}>
          {saving ? 'Adding…' : 'Add Player'}
        </button>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}

// ─── Add Team Form ─────────────────────────────────────────────────────────────

function AddTeamForm({
  hostId, onAdd, onLookup, onClose,
}: {
  hostId: string
  onAdd: ReturnType<typeof useMatchDetail>['addTeamPlayers']
  onLookup: ReturnType<typeof useMatchDetail>['lookupProfile']
  onClose: () => void
}) {
  const [teamName, setTeamName] = useState('')
  const [players, setPlayers] = useState([{ name: '', phone: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addRow = () => setPlayers(p => [...p, { name: '', phone: '' }])
  const updateRow = (i: number, field: 'name' | 'phone', val: string) =>
    setPlayers(p => p.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  const removeRow = (i: number) => setPlayers(p => p.filter((_, idx) => idx !== i))

  const handleAdd = async () => {
    if (!teamName.trim()) { setError('Team name is required'); return }
    const valid = players.filter(p => p.name.trim())
    if (!valid.length) { setError('Add at least one player'); return }
    setSaving(true)
    const { error: err } = await onAdd(teamName, valid, hostId)
    setSaving(false)
    if (err) { setError(err.message) } else { onClose() }
  }

  return (
    <div className="card">
      <h3 style={{ margin: '0 0 12px' }}>Add Team</h3>
      <div className="form-group" style={{ marginBottom: 12 }}>
        <label>Team name</label>
        <input placeholder="e.g. Team A" value={teamName} onChange={e => setTeamName(e.target.value)} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569', display: 'block', marginBottom: 6 }}>
          Players
        </label>
        {players.map((p, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 8 }}>
            <input
              placeholder="Name"
              value={p.name}
              onChange={e => updateRow(i, 'name', e.target.value)}
              style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
            />
            <input
              placeholder="Phone (optional)"
              value={p.phone}
              onChange={e => updateRow(i, 'phone', e.target.value)}
              inputMode="numeric"
              style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
            />
            {players.length > 1 && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: '#ef4444', padding: '4px 8px' }}
                onClick={() => removeRow(i)}
              >✕</button>
            )}
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={addRow}>+ Add row</button>
      </div>
      {error && <p style={{ color: '#ef4444', fontSize: '0.88rem', margin: '0 0 10px' }}>{error}</p>}
      <div className="flex gap-3">
        <button className="btn btn-success" style={{ flex: 1 }} disabled={saving} onClick={handleAdd}>
          {saving ? 'Adding…' : `Add Team (${players.filter(p => p.name.trim()).length} players)`}
        </button>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}

// ─── Turf Payments Tab ────────────────────────────────────────────────────────

function TurfTab({
  turfPayments, totalTurfPaid, turfDue, turfBalance,
  isHostOrAdmin, hostId, onAddPayment,
}: {
  turfPayments: ReturnType<typeof useMatchDetail>['turfPayments']
  totalTurfPaid: number
  turfDue: number
  turfBalance: number
  isHostOrAdmin: boolean
  hostId: string
  onAddPayment: ReturnType<typeof useMatchDetail>['addTurfPayment']
}) {
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const paise = rupeesToPaise(parseFloat(amount) || 0)
    if (paise <= 0) { setError('Enter a valid amount'); return }
    setSaving(true)
    const { error: err } = await onAddPayment({ amount: paise, method, notes, paid_by: hostId })
    setSaving(false)
    if (err) { setError(err.message) } else {
      setAmount(''); setNotes(''); setShowForm(false)
    }
  }

  const paidPercent = turfDue > 0 ? Math.min(100, Math.round((totalTurfPaid / turfDue) * 100)) : 0

  return (
    <div>
      {/* Summary card */}
      <div className="card" style={{ marginBottom: 16 }}>
        {turfDue > 0 ? (
          <>
            <div className="flex justify-between mb-4">
              <span className="subtle">Total turf cost</span>
              <strong>{formatPaise(turfDue)}</strong>
            </div>
            <div className="flex justify-between mb-4">
              <span className="subtle">Paid so far</span>
              <strong style={{ color: '#166534' }}>{formatPaise(totalTurfPaid)}</strong>
            </div>
            <div className="flex justify-between mb-4">
              <span className="subtle">Remaining</span>
              <strong style={{ color: turfBalance > 0 ? '#991b1b' : '#166534' }}>
                {turfBalance > 0 ? `${formatPaise(turfBalance)} due` : 'Fully paid ✓'}
              </strong>
            </div>
            {/* Progress bar */}
            <div style={{ background: '#f1f5f9', borderRadius: 4, height: 6 }}>
              <div style={{ background: '#166534', borderRadius: 4, height: 6, width: `${paidPercent}%`, transition: 'width 0.3s' }} />
            </div>
          </>
        ) : (
          <p className="subtle" style={{ margin: 0 }}>
            No billing set up yet. <Link to={`../../billing`} relative="path" className="subtle" style={{ textDecoration: 'underline' }}>Set up billing</Link> to track turf costs.
          </p>
        )}
      </div>

      {/* Payment history */}
      {turfPayments.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Payment History</h3>
          {turfPayments.map(p => (
            <div key={p.id} className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{formatPaise(p.amount)}</div>
                <div className="subtle" style={{ fontSize: '0.82rem' }}>
                  {METHOD_LABELS[p.method ?? ''] ?? p.method ?? 'Unknown'}
                  {p.notes ? ` · ${p.notes}` : ''}
                </div>
              </div>
              <div className="subtle" style={{ fontSize: '0.82rem' }}>
                {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add payment form */}
      {isHostOrAdmin && (
        <div className="card">
          {!showForm ? (
            <button
              className="btn btn-primary btn-block"
              onClick={() => setShowForm(true)}
            >
              Record Turf Payment
            </button>
          ) : (
            <form onSubmit={handleAdd}>
              <h3>Record Turf Payment</h3>
              <div className="form-group">
                <label>Amount (₹)</label>
                <input
                  type="number" placeholder="3000" min={1}
                  value={amount} onChange={e => setAmount(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Method</label>
                <select value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}>
                  {Object.entries(METHOD_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Notes (optional)</label>
                <input
                  placeholder="e.g. Advance payment, receipt #123"
                  value={notes} onChange={e => setNotes(e.target.value)}
                />
              </div>
              {error && <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: '0 0 12px' }}>{error}</p>}
              <div className="flex gap-3">
                <button type="submit" className="btn btn-success" style={{ flex: 1 }} disabled={saving}>
                  {saving ? 'Saving...' : 'Record Payment'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setError('') }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
