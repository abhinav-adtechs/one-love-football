import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLedger } from '../hooks/useLedger'
import { supabase } from '../lib/supabase'
import { formatPaise } from '../lib/currency'
import LedgerTable from '../components/LedgerTable'
import type { Match } from '../types'

export default function DashboardPage() {
  const { profile } = useAuth()
  const { entries, balance, isBlocked } = useLedger()
  const isHostOrAdmin = profile?.role === 'host' || profile?.role === 'admin'

  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [outstandingTotal, setOutstandingTotal] = useState(0)

  useEffect(() => {
    // Upcoming matches
    const today = new Date().toISOString().split('T')[0]
    supabase
      .from('matches')
      .select('*')
      .gte('scheduled_date', today)
      .order('scheduled_date')
      .limit(3)
      .then(({ data }) => setUpcomingMatches((data ?? []) as Match[]))

    if (isHostOrAdmin) {
      // Pending approval count
      supabase
        .from('ledger')
        .select('id', { count: 'exact', head: true })
        .eq('approval_status', 'pending_approval')
        .then(({ count }) => setPendingCount(count ?? 0))

      // Outstanding dues
      supabase
        .from('player_match_payments')
        .select('amount_due, amount_paid')
        .in('status', ['pending', 'overdue'])
        .then(({ data }) => {
          const total = (data ?? []).reduce((sum, p) => sum + (p.amount_due - p.amount_paid), 0)
          setOutstandingTotal(total)
        })
    }
  }, [isHostOrAdmin])

  const recentEntries = entries.slice(0, 5)

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>
        Hey, {profile?.display_name ?? 'Player'}
        {profile?.jersey_number ? ` #${profile.jersey_number}` : ''}
      </h2>

      {/* Balance Card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="subtle" style={{ margin: 0, fontSize: '0.85rem' }}>Your Balance</p>
            <p style={{
              margin: '4px 0 0',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: balance >= 0 ? '#166534' : '#991b1b'
            }}>
              {formatPaise(balance)}
            </p>
          </div>
          {isBlocked && (
            <Link to="/payments" className="btn btn-danger btn-sm">Clear Dues</Link>
          )}
        </div>
      </div>

      {/* Host Quick Actions */}
      {isHostOrAdmin && (
        <div className="grid-two" style={{ marginBottom: 16 }}>
          <Link to="/payments/approve" className="card" style={{ textDecoration: 'none' }}>
            <p className="subtle" style={{ margin: 0, fontSize: '0.85rem' }}>Pending Approvals</p>
            <p style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 700 }}>
              {pendingCount}
            </p>
          </Link>
          <div className="card">
            <p className="subtle" style={{ margin: 0, fontSize: '0.85rem' }}>Outstanding Dues</p>
            <p style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 700, color: outstandingTotal > 0 ? '#991b1b' : '#166534' }}>
              {formatPaise(outstandingTotal)}
            </p>
          </div>
        </div>
      )}

      {/* Upcoming Matches */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ margin: 0 }}>Upcoming Matches</h3>
          {isHostOrAdmin && (
            <Link to="/matches/new" className="btn btn-primary btn-sm">+ New</Link>
          )}
        </div>
        {upcomingMatches.length === 0 ? (
          <p className="subtle">No upcoming matches</p>
        ) : (
          upcomingMatches.map(m => (
            <div key={m.id} className="flex items-center justify-between" style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <Link to={`/matches/${m.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <strong>{m.title}</strong>
                <p className="subtle" style={{ margin: '2px 0 0', fontSize: '0.85rem' }}>
                  {new Date(m.scheduled_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {m.start_time ? ` at ${m.start_time.slice(0, 5)}` : ''}
                </p>
              </Link>
              <div className="flex gap-3">
                <span className={`badge ${m.status === 'roster_open' ? 'badge-pending' : m.status === 'confirmed' ? 'badge-approved' : ''}`}>
                  {m.status.replace('_', ' ')}
                </span>
                {isHostOrAdmin && (
                  <Link to={`/matches/${m.id}/billing`} className="btn btn-ghost btn-sm">
                    Billing
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ margin: 0 }}>Recent Transactions</h3>
          <Link to="/payments" className="btn btn-ghost btn-sm">View All</Link>
        </div>
        <LedgerTable entries={recentEntries} />
      </div>
    </div>
  )
}
