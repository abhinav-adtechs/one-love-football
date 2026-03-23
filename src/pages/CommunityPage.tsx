import { useState, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useCommunity, type CommunityMember } from '../hooks/useCommunity'
import type { PlayerPosition, UserRole } from '../types'

const POSITION_LABELS: Record<PlayerPosition, string> = {
  goalkeeper: 'GK',
  center_back: 'CB',
  left_back: 'LB',
  right_back: 'RB',
  defensive_mid: 'DM',
  central_mid: 'CM',
  attacking_mid: 'AM',
  left_wing: 'LW',
  right_wing: 'RW',
  striker: 'ST',
  any: 'Any',
}

const ALL_POSITIONS: PlayerPosition[] = [
  'goalkeeper', 'center_back', 'left_back', 'right_back',
  'defensive_mid', 'central_mid', 'attacking_mid',
  'left_wing', 'right_wing', 'striker', 'any',
]

const ROLE_COLORS: Record<UserRole, string> = {
  player: '#3b82f6',
  host: '#8b5cf6',
  admin: '#ef4444',
}

// Formats a phone number stored as 91XXXXXXXXXX → display as 10-digit
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('91') && digits.length === 12) return digits.slice(2)
  return digits
}

export default function CommunityPage() {
  const { profile: currentUser } = useAuth()
  const { members, loading, saving, updateMember } = useCommunity()
  const [search, setSearch] = useState('')
  const [editingMember, setEditingMember] = useState<CommunityMember | null>(null)

  const isAdmin = currentUser?.role === 'admin'
  const isHostOrAdmin = currentUser?.role === 'host' || isAdmin

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      m =>
        m.display_name.toLowerCase().includes(q) ||
        formatPhone(m.phone).includes(q) ||
        m.phone.includes(q)
    )
  }, [members, search])

  const canEdit = (member: CommunityMember) =>
    isAdmin || isHostOrAdmin || member.id === currentUser?.id

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div className="spinner" style={{ margin: '0 auto' }} />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ margin: 0 }}>Community ({members.length})</h2>
      </div>

      {/* Search */}
      <div className="form-group" style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center">
          <p className="subtle">No members found</p>
        </div>
      ) : (
        filtered.map(member => (
          <MemberCard
            key={member.id}
            member={member}
            canEdit={canEdit(member)}
            isAdmin={isAdmin}
            onEdit={() => setEditingMember(member)}
          />
        ))
      )}

      {editingMember && (
        <EditModal
          member={editingMember}
          isAdmin={isAdmin}
          saving={saving}
          onSave={async updates => {
            await updateMember(editingMember.id, updates)
            setEditingMember(null)
          }}
          onClose={() => setEditingMember(null)}
        />
      )}
    </div>
  )
}

function MemberCard({
  member,
  canEdit,
  isAdmin,
  onEdit,
}: {
  member: CommunityMember
  canEdit: boolean
  isAdmin: boolean
  onEdit: () => void
}) {
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="flex items-center justify-between mb-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Jersey bubble */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#0f172a',
              color: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.85rem',
              flexShrink: 0,
            }}
          >
            {member.jersey_number != null ? `#${member.jersey_number}` : '?'}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '1rem', lineHeight: 1.2 }}>
              {member.display_name}
              {member.is_banned && (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: '0.7rem',
                    background: '#fef2f2',
                    color: '#dc2626',
                    padding: '1px 6px',
                    borderRadius: 99,
                    fontWeight: 600,
                  }}
                >
                  BANNED
                </span>
              )}
            </div>
            <div className="subtle" style={{ fontSize: '0.85rem' }}>
              {formatPhone(member.phone)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            className="badge"
            style={{
              background: ROLE_COLORS[member.role],
              color: '#fff',
              fontSize: '0.7rem',
              padding: '2px 8px',
            }}
          >
            {member.role}
          </span>
          {canEdit && (
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Positions */}
      {member.default_positions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
          {member.default_positions.map(pos => (
            <span
              key={pos}
              className="badge"
              style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569' }}
            >
              {POSITION_LABELS[pos] ?? pos}
            </span>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          borderTop: '1px solid #f1f5f9',
          paddingTop: 12,
        }}
      >
        <StatPill label="Played" value={member.stats.matchesPlayed} />
        <StatPill label="Goals" value={member.stats.goals} />
        <StatPill label="Assists" value={member.stats.assists} />
        <StatPill label="MOTM" value={member.stats.motmCount} />
      </div>

      {/* Show ban reason to admins */}
      {isAdmin && member.is_banned && member.ban_reason && (
        <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: '#dc2626' }}>
          Ban reason: {member.ban_reason}
        </p>
      )}
    </div>
  )
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontWeight: 700, fontSize: '1.1rem', lineHeight: 1 }}>{value}</div>
      <div className="subtle" style={{ fontSize: '0.7rem', marginTop: 2 }}>
        {label}
      </div>
    </div>
  )
}

// ---- Edit Modal ----

interface EditFormState {
  display_name: string
  jersey_number: string
  positions: PlayerPosition[]
  role: UserRole
  is_banned: boolean
  ban_reason: string
}

function EditModal({
  member,
  isAdmin,
  saving,
  onSave,
  onClose,
}: {
  member: CommunityMember
  isAdmin: boolean
  saving: boolean
  onSave: (updates: {
    display_name?: string
    jersey_number?: number | null
    default_positions?: PlayerPosition[]
    role?: UserRole
    is_banned?: boolean
    ban_reason?: string | null
  }) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<EditFormState>({
    display_name: member.display_name,
    jersey_number: member.jersey_number != null ? String(member.jersey_number) : '',
    positions: member.default_positions,
    role: member.role,
    is_banned: member.is_banned,
    ban_reason: member.ban_reason ?? '',
  })
  const [error, setError] = useState('')

  const togglePosition = (pos: PlayerPosition) => {
    setForm(f => ({
      ...f,
      positions: f.positions.includes(pos)
        ? f.positions.filter(p => p !== pos)
        : [...f.positions, pos],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.display_name.trim()) {
      setError('Name is required')
      return
    }

    const jerseyNum =
      form.jersey_number.trim() === '' ? null : parseInt(form.jersey_number, 10)
    if (form.jersey_number.trim() !== '' && (isNaN(jerseyNum!) || jerseyNum! < 1)) {
      setError('Invalid jersey number')
      return
    }

    try {
      await onSave({
        display_name: form.display_name.trim(),
        jersey_number: jerseyNum,
        default_positions: form.positions,
        ...(isAdmin
          ? {
              role: form.role,
              is_banned: form.is_banned,
              ban_reason: form.is_banned ? form.ban_reason.trim() || null : null,
            }
          : {}),
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.6)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '20px 20px 0 0',
          padding: 24,
          width: '100%',
          maxWidth: 500,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ margin: 0 }}>Edit — {member.display_name}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>

        <div
          className="subtle"
          style={{ fontSize: '0.85rem', marginBottom: 16, padding: '6px 10px', background: '#f8fafc', borderRadius: 8 }}
        >
          Phone: {formatPhone(member.phone)}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="edit-name">Display Name</label>
            <input
              id="edit-name"
              type="text"
              value={form.display_name}
              onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-jersey">Jersey Number</label>
            <input
              id="edit-jersey"
              type="number"
              placeholder="e.g. 10"
              value={form.jersey_number}
              onChange={e => setForm(f => ({ ...f, jersey_number: e.target.value }))}
              min={1}
              max={99}
            />
          </div>

          <div className="form-group">
            <label>Positions</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {ALL_POSITIONS.map(pos => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => togglePosition(pos)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 99,
                    border: '1px solid',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    background: form.positions.includes(pos) ? '#0f172a' : '#f1f5f9',
                    color: form.positions.includes(pos) ? '#fff' : '#475569',
                    borderColor: form.positions.includes(pos) ? '#0f172a' : '#e2e8f0',
                    fontFamily: 'inherit',
                  }}
                >
                  {POSITION_LABELS[pos]}
                </button>
              ))}
            </div>
          </div>

          {isAdmin && (
            <>
              <div className="form-group">
                <label htmlFor="edit-role">Role</label>
                <select
                  id="edit-role"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                >
                  <option value="player">Player</option>
                  <option value="host">Host</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  id="edit-banned"
                  type="checkbox"
                  checked={form.is_banned}
                  onChange={e => setForm(f => ({ ...f, is_banned: e.target.checked }))}
                  style={{ width: 18, height: 18 }}
                />
                <label htmlFor="edit-banned" style={{ marginBottom: 0 }}>
                  Banned
                </label>
              </div>

              {form.is_banned && (
                <div className="form-group">
                  <label htmlFor="edit-ban-reason">Ban Reason</label>
                  <input
                    id="edit-ban-reason"
                    type="text"
                    value={form.ban_reason}
                    onChange={e => setForm(f => ({ ...f, ban_reason: e.target.value }))}
                    placeholder="Reason for ban"
                  />
                </div>
              )}
            </>
          )}

          {error && (
            <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: '0 0 12px' }}>{error}</p>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
