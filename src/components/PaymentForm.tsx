import { useState } from 'react'
import type { PaymentMethod } from '../types'
import { rupeesToPaise } from '../lib/currency'
import PaymentProofUpload from './PaymentProofUpload'

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'google_pay', label: 'Google Pay' },
  { value: 'phonepe', label: 'PhonePe' },
  { value: 'upi_id', label: 'UPI ID' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
]

interface PaymentFormProps {
  onSubmit: (amountPaise: number, method: PaymentMethod, proofFile?: File) => Promise<{ error: string | null }>
}

export default function PaymentForm({ onSubmit }: PaymentFormProps) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('google_pay')
  const [proofFile, setProofFile] = useState<File | undefined>()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    const rupees = parseFloat(amount)
    if (!rupees || rupees <= 0) {
      setError('Enter a valid amount')
      return
    }

    if (method !== 'cash' && !proofFile) {
      setError('Upload payment proof (screenshot)')
      return
    }

    setSubmitting(true)
    const result = await onSubmit(rupeesToPaise(rupees), method, proofFile)
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setAmount('')
      setProofFile(undefined)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="amount">Amount (₹)</label>
        <input
          id="amount"
          type="number"
          placeholder="300"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          min={1}
          step="1"
        />
      </div>

      <div className="form-group">
        <label htmlFor="method">Payment Method</label>
        <select id="method" value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}>
          {METHODS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {method !== 'cash' && (
        <div className="form-group">
          <label>Payment Proof</label>
          <PaymentProofUpload onFileSelected={setProofFile} />
        </div>
      )}

      {error && <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: '0 0 12px' }}>{error}</p>}
      {success && <p style={{ color: '#166534', fontSize: '0.9rem', margin: '0 0 12px' }}>Payment submitted for approval</p>}

      <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit Payment'}
      </button>
    </form>
  )
}
