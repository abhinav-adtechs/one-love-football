import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import LoadingSpinner from './LoadingSpinner'

export default function ProtectedRoute() {
  const { session, loading, isNewUser } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingSpinner />
  if (!session) return <Navigate to="/login" replace />

  if (isNewUser && location.pathname !== '/profile-setup') {
    return <Navigate to="/profile-setup" replace />
  }

  return <Outlet />
}
