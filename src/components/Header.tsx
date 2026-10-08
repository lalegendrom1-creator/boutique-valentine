import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Menu, X, Scissors, User, LogOut, LayoutDashboard, Heart } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function Header() {
  const { session, profile, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenu, setUserMenu] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const navLinks = [
    { label: 'Accueil', path: '/' },
    { label: 'Rechercher', path: '/search' },
    { label: 'Comment ça marche', path: '/#how-it-works' },
  ]

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-medium text-neutral-900">
              Beauty<span className="text-primary-600">Near</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  location.pathname === link.path
                    ? 'text-primary-700 bg-primary-50'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenu(!userMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-neutral-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-700" />
                  </div>
                  <span className="text-sm font-medium text-neutral-700">
                    {profile?.name || 'Mon compte'}
                  </span>
                </button>
                {userMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-neutral-200 py-2 animate-slide-down">
                    {profile?.role === 'client' && (
                      <>
                        <Link to="/favorites" className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50" onClick={() => setUserMenu(false)}>
                          <Heart className="w-4 h-4" /> Mes favoris
                        </Link>
                        <Link to="/appointments" className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50" onClick={() => setUserMenu(false)}>
                          <User className="w-4 h-4" /> Mes rendez-vous
                        </Link>
                      </>
                    )}
                    {profile?.role === 'salon' && (
                      <Link to="/dashboard" className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50" onClick={() => setUserMenu(false)}>
                        <LayoutDashboard className="w-4 h-4" /> Tableau de bord
                      </Link>
                    )}
                    <hr className="my-1 border-neutral-100" />
                    <button onClick={handleSignOut} className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left">
                      <LogOut className="w-4 h-4" /> Déconnexion
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">Connexion</Link>
                <Link to="/register" className="btn-primary">Inscription</Link>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 rounded-lg hover:bg-neutral-100"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-neutral-200 animate-slide-down">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-lg"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <hr className="my-2 border-neutral-100" />
              {session ? (
                <>
                  {profile?.role === 'salon' ? (
                    <Link to="/dashboard" className="px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-lg" onClick={() => setMobileOpen(false)}>
                      Tableau de bord
                    </Link>
                  ) : (
                    <>
                      <Link to="/favorites" className="px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-lg" onClick={() => setMobileOpen(false)}>
                        Mes favoris
                      </Link>
                      <Link to="/appointments" className="px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-lg" onClick={() => setMobileOpen(false)}>
                        Mes rendez-vous
                      </Link>
                    </>
                  )}
                  <button onClick={handleSignOut} className="px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg text-left">
                    Déconnexion
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2 px-4 py-2">
                  <Link to="/login" className="btn-secondary w-full" onClick={() => setMobileOpen(false)}>Connexion</Link>
                  <Link to="/register" className="btn-primary w-full" onClick={() => setMobileOpen(false)}>Inscription</Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
