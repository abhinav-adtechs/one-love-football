import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) return <div className="loading-page"><div className="spinner" /></div>
  if (session) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length !== 10) {
      setError('Enter a valid 10-digit phone number')
      return
    }

    const fullPhone = `+91${cleaned}`
    setSubmitting(true)

    const { error: sendError } = await supabase.auth.signInWithOtp({ phone: fullPhone })
    setSubmitting(false)

    if (sendError) {
      setError(sendError.message)
      return
    }

    navigate('/verify', { state: { phone: fullPhone } })
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>One Love Football</h1>
        <p>Sign in with your WhatsApp number</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <div className="flex items-center gap-3">
              <span style={{ fontSize: '1rem', fontWeight: 600, whiteSpace: 'nowrap' }}>+91</span>
              <input
                id="phone"
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                maxLength={10}
                autoFocus
              />
            </div>
          </div>

          {error && <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: '0 0 12px' }}>{error}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </form>
      </div>
    </div>
  )
}
