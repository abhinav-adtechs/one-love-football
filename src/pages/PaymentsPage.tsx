import { useLedger } from '../hooks/useLedger'
import { formatPaise } from '../lib/currency'
import PaymentForm from '../components/PaymentForm'
import LedgerTable from '../components/LedgerTable'

export default function PaymentsPage() {
  const { entries, balance, isBlocked, loading, submitTopup } = useLedger()

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
  }

  return (
    <div>
      {/* Balance Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="subtle" style={{ margin: 0, fontSize: '0.85rem' }}>Your Balance</p>
            <p style={{
              margin: '4px 0 0',
              fontSize: '1.75rem',
              fontWeight: 700,
              color: balance >= 0 ? '#166534' : '#991b1b'
            }}>
              {formatPaise(balance)}
            </p>
          </div>
          {isBlocked && (
            <span className="balance-blocked">
              Clear dues to join matches
            </span>
          )}
        </div>
      </div>

      {/* Top-Up Form */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Top Up / Make Payment</h3>
        <PaymentForm onSubmit={submitTopup} />
      </div>

      {/* Ledger History */}
      <div className="card">
        <h3>Transaction History</h3>
        <LedgerTable entries={entries} />
      </div>
    </div>
  )
}
