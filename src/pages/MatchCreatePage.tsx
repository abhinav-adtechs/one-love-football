import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { parseWhatsApp, normalizePhone, phonesMatch } from '../lib/parseWhatsApp'
import type { ParsedMatch, ParsedPlayer } from '../lib/parseWhatsApp'
import type { GameFormat, Profile } from '../types'
import RoleGate from '../components/RoleGate'
import { rupeesToPaise } from '../lib/currency'

const FORMAT_PLAYER_COUNT: Record<GameFormat, number> = {
  '5v5': 10, '6v6': 12, '7v7': 14, '8v8': 16, '9v9': 18, '10v10': 20, '11v11': 22,
  '6v6v6': 18, '7v7v7': 21, '8v8v8': 24, '9v9v9': 27,
}

const ALL_FORMATS: GameFormat[] = [
  '7v7', '9v9', '11v11', '8v8', '7v7v7', '9v9v9', '8v8v8', '6v6', '5v5', '10v10', '6v6v6',
]

const TURFS = [
  { value: 'SUFC', label: 'SUFC – South United FC' },
  { value: 'BFS',  label: 'BFS – Bangalore Football Stadium' },
  { value: 'HAL',  label: 'HAL – HAL Aerospace Ground' },
]

export default function MatchCreatePage() {
  return (
    <RoleGate allowed={['host', 'admin']}>
      <CreateContent />
    </RoleGate>
  )
}

interface PlayerRow extends ParsedPlayer {
  matchedProfile: Profile | null
  confirmed: boolean  // include in roster
  // plusOneOf: index into players array (inherited from ParsedPlayer)
}

function CreateContent() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const [message, setMessage] = useState('')
  const [parsed, setParsed] = useState<ParsedMatch | null>(null)

  // Editable match fields
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [turf, setTurf] = useState(TURFS[0].value)
  const [format, setFormat] = useState<GameFormat>('7v7')
  const [playerCount, setPlayerCount] = useState<number>(FORMAT_PLAYER_COUNT['7v7'])
  const [totalCostRupees, setTotalCostRupees] = useState('')
  const [feeRupees, setFeeRupees] = useState('')

  const recalcFee = useCallback((total: string, count: number) => {
    const t = parseFloat(total)
    if (!isNaN(t) && count > 0) {
      setFeeRupees(String(Math.ceil(t / count)))
    } else {
      setFeeRupees('')
    }
  }, [])

  // Player rows (editable after parse)
  const [players, setPlayers] = useState<PlayerRow[]>([])

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, phone, display_name, role, jersey_number, avatar_url, default_positions, bio, is_banned, ban_reason, created_at, updated_at')
      .then(({ data }) => setProfiles((data ?? []) as Profile[]))
  }, [])

  const handleParse = () => {
    if (!message.trim()) return
    const result = parseWhatsApp(message)
    setParsed(result)
    setTitle(result.title)
    setDate(result.date ?? '')
    setTime(result.time ?? '')

    const rows: PlayerRow[] = result.players.map(p => {
      const matched = p.phone
        ? profiles.find(pr => phonesMatch(pr.phone, p.phone!)) ?? null
        : null
      return { ...p, matchedProfile: matched, confirmed: true }
    })
    setPlayers(rows)
  }

  const updatePlayer = (idx: number, patch: Partial<PlayerRow>) => {
    setPlayers(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p))
  }

  const addBlankPlayer = () => {
    setPlayers(prev => [
      ...prev,
      { raw: '', name: '', phone: null, isPaid: false, isGuest: false, matchedProfile: null, confirmed: true },
    ])
  }

  const handleSave = async () => {
    if (!date) { setError('Match date is required'); return }
    setError('')
    setSaving(true)

    const feePaise = rupeesToPaise(parseFloat(feeRupees) || 0)
    const confirmedPlayers = players.filter(p => p.confirmed)
    const turfLabel = TURFS.find(t => t.value === turf)?.label ?? turf

    // 1. Create match
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .insert({
        title: title || 'Football Match',
        match_type: 'community',
        status: 'confirmed',
        format,
        scheduled_date: date,
        start_time: time || null,
        venue_id: null,
        max_players: playerCount,
        min_players: Math.floor(playerCount / 2),
        fee_per_player: feePaise,
        currency: 'INR',
        notes: `Venue: ${turfLabel}`,
        created_by: session!.user.id,
      })
      .select('id')
      .single()

    if (matchError) { setError(matchError.message); setSaving(false); return }

    const matchId = matchData.id

    // 2. Create roster entries
    const rosterRows = confirmedPlayers.map((p, idx) => {
      const isPlusOne = p.plusOneOf !== null
      // For +1s, attribute invited_by to the parent player's profile (if matched), else host
      const parentProfile = isPlusOne && p.plusOneOf !== null
        ? players[p.plusOneOf]?.matchedProfile ?? null
        : null
      return {
        match_id: matchId,
        profile_id: isPlusOne ? null : (p.matchedProfile?.id ?? null),
        guest_name: isPlusOne ? '+1' : (p.matchedProfile ? null : (p.name || 'Guest')),
        guest_phone: isPlusOne ? null : (p.matchedProfile ? null : p.phone),
        source: isPlusOne ? 'guest_plus_one' : (p.matchedProfile ? 'community' : 'external'),
        status: 'confirmed',
        position: idx + 1,
        amount_collected: 0,
        paid_at: null,
        invited_by: parentProfile?.id ?? session!.user.id,
      }
    })

    const { error: rosterError } = await supabase
      .from('match_roster')
      .insert(rosterRows)

    if (rosterError) { setError(rosterError.message); setSaving(false); return }

    setSaving(false)
    navigate(`/matches/${matchId}`)
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>New Match</h2>

      {/* Step 1: Paste WhatsApp message */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Paste WhatsApp Message</h3>
        <textarea
          rows={6}
          placeholder={`e.g.\n⚽ Football - Sunday 22nd March\nVenue: XYZ Turf, Kondapur\nTime: 6:30 PM\n1. Abhinav ✅\n2. Rahul 9876543210\n3. Guest - John`}
          value={message}
          onChange={e => setMessage(e.target.value)}
          style={{
            width: '100%', fontFamily: 'monospace', fontSize: '0.85rem',
            border: '1px solid #e2e8f0', borderRadius: 8, padding: 12,
            resize: 'vertical', boxSizing: 'border-box',
          }}
        />
        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: 12 }}
          onClick={handleParse}
          disabled={!message.trim()}
        >
          Parse Message
        </button>
      </div>

      {parsed && (
        <>
          {/* Step 2: Edit match details */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3>Match Details</h3>
            <div className="form-group">
              <label>Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Football Match" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Time</label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Turf</label>
              <select value={turf} onChange={e => setTurf(e.target.value)}>
                {TURFS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Format</label>
                <select
                  value={format}
                  onChange={e => {
                    const f = e.target.value as GameFormat
                    setFormat(f)
                    const count = FORMAT_PLAYER_COUNT[f]
                    setPlayerCount(count)
                    recalcFee(totalCostRupees, count)
                  }}
                >
                  {ALL_FORMATS.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Players</label>
                <input
                  type="number" min={2}
                  value={playerCount}
                  onChange={e => {
                    const count = parseInt(e.target.value) || 0
                    setPlayerCount(count)
                    recalcFee(totalCostRupees, count)
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Total cost (₹)</label>
                <input
                  type="number" placeholder="4200" min={0}
                  value={totalCostRupees}
                  onChange={e => {
                    setTotalCostRupees(e.target.value)
                    recalcFee(e.target.value, playerCount)
                  }}
                />
              </div>
              <div className="form-group">
                <label>Fee per player (₹)</label>
                <input
                  type="number" placeholder="300" min={0}
                  value={feeRupees}
                  onChange={e => setFeeRupees(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Step 3: Review player list */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ margin: 0 }}>
                Players ({players.filter(p => p.confirmed).length})
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={addBlankPlayer}>+ Add</button>
            </div>

            {players.length === 0 ? (
              <p className="subtle text-center">No players found. Add manually.</p>
            ) : (
              players.map((p, idx) => (
                <PlayerRowCard
                  key={idx}
                  player={p}
                  parentPlayer={p.plusOneOf !== null ? players[p.plusOneOf] ?? null : null}
                  profiles={profiles}
                  onChange={patch => updatePlayer(idx, patch)}
                  onRemove={() => setPlayers(prev => prev.filter((_, i) => i !== idx))}
                />
              ))
            )}
          </div>

          {error && <p style={{ color: '#ef4444', margin: '0 0 12px' }}>{error}</p>}

          <button
            className="btn btn-success btn-block"
            onClick={handleSave}
            disabled={saving || !date}
          >
            {saving ? 'Creating...' : `Create Match with ${players.filter(p => p.confirmed).length} Players`}
          </button>
        </>
      )}
    </div>
  )
}

function PlayerRowCard({
  player, parentPlayer, profiles, onChange, onRemove,
}: {
  player: PlayerRow
  parentPlayer: PlayerRow | null
  profiles: Profile[]
  onChange: (patch: Partial<PlayerRow>) => void
  onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)

  const isPlusOne = player.plusOneOf !== null
  const matchDisplay = player.matchedProfile?.display_name ?? null
  const parentName = parentPlayer?.matchedProfile?.display_name ?? parentPlayer?.name ?? 'Unknown'

  // +1 row: compact, attributed, no name/phone editing needed
  if (isPlusOne) {
    return (
      <div style={{
        border: '1px dashed #cbd5e1',
        borderRadius: 8,
        padding: '8px 12px',
        marginBottom: 8,
        marginLeft: 28,
        opacity: player.confirmed ? 1 : 0.45,
        background: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={player.confirmed}
            onChange={e => onChange({ confirmed: e.target.checked })}
            style={{ width: 16, height: 16 }}
          />
          <div>
            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
              +1 <span style={{ color: '#94a3b8' }}>·</span> brought by{' '}
              <strong style={{ color: '#334155' }}>{parentName}</strong>
            </span>
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          style={{ color: '#ef4444' }}
          onClick={onRemove}
        >✕</button>
      </div>
    )
  }

  return (
    <div style={{
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      opacity: player.confirmed ? 1 : 0.45,
      background: player.matchedProfile ? '#f0fdf4' : '#fff',
    }}>
      {editing ? (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <input
              placeholder="Name"
              value={player.name}
              onChange={e => onChange({ name: e.target.value })}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            />
            <input
              placeholder="Phone (10-digit)"
              value={player.phone ?? ''}
              onChange={e => {
                const phone = normalizePhone(e.target.value) ?? (e.target.value || null)
                const matched = phone
                  ? profiles.find(pr => phonesMatch(pr.phone, phone)) ?? null
                  : null
                onChange({ phone, matchedProfile: matched })
              }}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            />
          </div>
          <div className="flex gap-3">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
              <input type="checkbox" checked={player.isPaid} onChange={e => onChange({ isPaid: e.target.checked })} />
              Already paid
            </label>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)} style={{ marginLeft: 'auto' }}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={player.confirmed}
              onChange={e => onChange({ confirmed: e.target.checked })}
              style={{ width: 16, height: 16 }}
            />
            <div>
              <div style={{ fontWeight: 500, fontSize: '0.95rem' }}>
                {(matchDisplay ?? player.name) || 'Unnamed'}
                {player.isGuest && <span className="subtle" style={{ marginLeft: 6, fontSize: '0.8rem' }}>(guest)</span>}
              </div>
              <div className="subtle" style={{ fontSize: '0.8rem' }}>
                {player.phone && <span style={{ marginRight: 8 }}>{player.phone}</span>}
                {matchDisplay && <span style={{ color: '#166534' }}>✓ Matched</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {player.isPaid && (
              <span className="badge badge-approved" style={{ fontSize: '0.75rem' }}>Paid</span>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit</button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: '#ef4444' }}
              onClick={onRemove}
            >✕</button>
          </div>
        </div>
      )}
    </div>
  )
}
