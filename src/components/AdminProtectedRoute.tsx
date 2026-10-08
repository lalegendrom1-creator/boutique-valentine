import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { ReactNode } from 'react'

interface AdminProtectedRouteProps {
  children: ReactNode
}

export default function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
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
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  // Si on est connecté mais qu'on n'est pas admin
  if (profile && profile.role !== 'admin') {
    // La consigne : "Après connexion, si le compte n'est pas admin, afficher « Accès refusé » et le déconnecter."
    // Nous gérons cela directement dans AdminLoginPage au moment de la connexion.
    // Mais par précaution, on redirige vers /admin/login si quelqu'un force l'URL.
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}
