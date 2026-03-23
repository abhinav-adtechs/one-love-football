import { useBalanceCheck } from '../hooks/useLedger'
import { formatPaise } from '../lib/currency'

export default function BalanceBadge() {
  const { balance, isBlocked, loading } = useBalanceCheck()

  if (loading) return null

  if (isBlocked) {
    return <span className="balance-blocked">{formatPaise(balance)}</span>
  }

  return (
    <span className={balance >= 0 ? 'balance-positive' : 'balance-negative'}
      style={{ fontWeight: 600, fontSize: '0.9rem' }}>
      {formatPaise(balance)}
    </span>
  )
}
