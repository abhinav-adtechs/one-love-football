import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import BalanceBadge from './BalanceBadge'
import NotificationBell from './NotificationBell'

export default function Layout() {
  const { profile, signOut } = useAuth()
  const isHostOrAdmin = profile?.role === 'host' || profile?.role === 'admin'

  return (
    <>
      <div className="app-header">
        <h1>One Love Football</h1>
        <div className="app-header-right">
          <BalanceBadge />
          <NotificationBell />
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: '#f8fafc', borderColor: 'rgba(248,250,252,0.2)' }}
            onClick={signOut}
          >
            Logout
          </button>
        </div>
      </div>

      <div className="page-content">
        <Outlet />
      </div>

      <nav className="bottom-nav">
        <NavLink to="/" end>
          <span>⚽</span>
          Home
        </NavLink>
        <NavLink to="/payments">
          <span>💰</span>
          Payments
        </NavLink>
        {isHostOrAdmin && (
          <NavLink to="/matches/new">
            <span>➕</span>
            New Match
          </NavLink>
        )}
        <NavLink to="/community">
          <span>👥</span>
          Community
        </NavLink>
        {isHostOrAdmin && (
          <NavLink to="/payments/approve">
            <span>✅</span>
            Approve
          </NavLink>
        )}
      </nav>
    </>
  )
}
