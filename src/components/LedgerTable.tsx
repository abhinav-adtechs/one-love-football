import type { LedgerEntry } from '../types'
import { formatPaise } from '../lib/currency'

const TYPE_LABELS: Record<string, string> = {
  game_fee: 'Game Fee',
  late_fee: 'Late Fee',
  no_show_fee: 'No-Show Fee',
  extension_fee: 'Extension Fee',
  advance_payment: 'Advance',
  topup: 'Top-Up',
  refund: 'Refund',
  adjustment: 'Adjustment',
}

const STATUS_CLASS: Record<string, string> = {
  pending_approval: 'badge-pending',
  approved: 'badge-approved',
  rejected: 'badge-rejected',
}

const STATUS_LABEL: Record<string, string> = {
  pending_approval: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}

interface LedgerTableProps {
  entries: LedgerEntry[]
  showPlayer?: boolean
  playerNames?: Record<string, string>
}

export default function LedgerTable({ entries, showPlayer, playerNames }: LedgerTableProps) {
  if (entries.length === 0) {
    return <p className="subtle" style={{ textAlign: 'center', padding: 20 }}>No transactions yet</p>
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            {showPlayer && <th>Player</th>}
            <th>Type</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <tr key={entry.id}>
              <td>{formatDate(entry.created_at)}</td>
              {showPlayer && <td>{playerNames?.[entry.profile_id] ?? '—'}</td>}
              <td>{TYPE_LABELS[entry.entry_type] ?? entry.entry_type}</td>
              <td style={{ fontWeight: 600, color: entry.amount >= 0 ? '#166534' : '#991b1b' }}>
                {entry.amount >= 0 ? '+' : ''}{formatPaise(entry.amount)}
              </td>
              <td style={{ textTransform: 'capitalize' }}>{entry.method?.replace('_', ' ') ?? '—'}</td>
              <td>
                <span className={`badge ${STATUS_CLASS[entry.approval_status] ?? ''}`}>
                  {STATUS_LABEL[entry.approval_status] ?? entry.approval_status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
