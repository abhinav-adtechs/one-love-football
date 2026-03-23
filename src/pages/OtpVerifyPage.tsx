import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export default function OtpVerifyPage() {
  const { session, loading, isNewUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const phone = (location.state as { phone?: string })?.phone

  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  // After auth completes, redirect based on profile state
  useEffect(() => {
    if (session && !loading) {
      navigate(isNewUser ? '/profile-setup' : '/', { replace: true })
    }
  }, [session, loading, isNewUser, navigate])

  if (!phone) return <Navigate to="/login" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (otp.length !== 6) {
      setError('Enter the 6-digit code')
      return
    }

    setSubmitting(true)
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: 'sms',
    })
    setSubmitting(false)

    if (verifyError) {
      setError(verifyError.message)
    }
    // onAuthStateChange in AuthContext will handle the redirect via the useEffect above
  }

  const handleResend = async () => {
    setCooldown(60)
    await supabase.auth.signInWithOtp({ phone })
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Verify OTP</h1>
        <p>Enter the 6-digit code sent to {phone}</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="otp">Verification Code</label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              placeholder="123456"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              autoFocus
              style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.3em' }}
            />
          </div>

          {error && <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: '0 0 12px' }}>{error}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        <div className="text-center mt-4">
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleResend}
            disabled={cooldown > 0}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
          </button>
        </div>
      </div>
    </div>
  )
}
