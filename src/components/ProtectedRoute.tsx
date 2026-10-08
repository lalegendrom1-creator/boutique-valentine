import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  roles?: UserRole[]
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && profile && !roles.includes(profile.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
