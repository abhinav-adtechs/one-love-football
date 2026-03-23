import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import type { PlayerPosition } from '../types'

const POSITIONS: { value: PlayerPosition; label: string }[] = [
  { value: 'goalkeeper', label: 'Goalkeeper' },
  { value: 'center_back', label: 'Center Back' },
  { value: 'left_back', label: 'Left Back' },
  { value: 'right_back', label: 'Right Back' },
  { value: 'defensive_mid', label: 'Defensive Mid' },
  { value: 'central_mid', label: 'Central Mid' },
  { value: 'attacking_mid', label: 'Attacking Mid' },
  { value: 'left_wing', label: 'Left Wing' },
  { value: 'right_wing', label: 'Right Wing' },
  { value: 'striker', label: 'Striker' },
  { value: 'any', label: 'Any Position' },
]

export default function ProfileSetupPage() {
  const { profile } = useAuth()
  const { updateProfile } = useProfile()
  const navigate = useNavigate()

  const [name, setName] = useState(profile?.display_name === 'Player' ? '' : profile?.display_name ?? '')
  const [jersey, setJersey] = useState(profile?.jersey_number?.toString() ?? '')
  const [positions, setPositions] = useState<PlayerPosition[]>(profile?.default_positions ?? [])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const togglePosition = (pos: PlayerPosition) => {
    setPositions(prev =>
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Name is required')
      return
    }

    setSubmitting(true)
    const { error: updateError } = await updateProfile({
      display_name: name.trim(),
      jersey_number: jersey ? parseInt(jersey, 10) : null,
      default_positions: positions,
    })
    setSubmitting(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    navigate('/', { replace: true })
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <h1>Complete Your Profile</h1>
        <p>Tell us about yourself</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Display Name *</label>
            <input
              id="name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="jersey">Jersey Number</label>
            <input
              id="jersey"
              type="number"
              placeholder="10"
              value={jersey}
              onChange={e => setJersey(e.target.value)}
              min={1}
              max={99}
            />
          </div>

          <div className="form-group">
            <label>Preferred Positions</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {POSITIONS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  className={`badge ${positions.includes(p.value) ? 'highlight' : ''}`}
                  onClick={() => togglePosition(p.value)}
                  style={{ cursor: 'pointer' }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: '0 0 12px' }}>{error}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Saving...' : 'Get Started'}
          </button>
        </form>
      </div>
    </div>
  )
}
