import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { UserRole } from '../types'
import type { ReactNode } from 'react'

interface RoleGateProps {
  allowed: UserRole[]
  children: ReactNode
  fallback?: ReactNode
}

export default function RoleGate({ allowed, children, fallback }: RoleGateProps) {
  const { profile, loading } = useAuth()

  // Still resolving auth — show spinner briefly
  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
  }

  // Auth resolved but no profile row (shouldn't normally happen)
  if (!profile) return null

  // Admin inherits host permissions
  const effectiveRoles: UserRole[] = profile.role === 'admin'
    ? ['admin', 'host', 'player']
    : profile.role === 'host'
      ? ['host', 'player']
      : ['player']

  const hasAccess = allowed.some(r => effectiveRoles.includes(r))

  if (!hasAccess) {
    return fallback ? <>{fallback}</> : <Navigate to="/" replace />
  }

  return <>{children}</>
}
