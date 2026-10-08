import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Shield, Lock, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function AdminLoginPage() {
  const { signIn, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Balise noindex
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'robots')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', 'noindex')
    return () => {
      // Optionnel: nettoyer au démontage, bien que d'autres pages admin utiliseront le même tag
      meta?.setAttribute('content', 'index, follow')
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    let finalEmail = email
    
    // --- RACCOURCI ADMIN ---
    if (email.toLowerCase().trim() === 'admin' && password === 'valentine1234') {
      finalEmail = 'admin@valentine.com' 
    }

    const { error: signInError, role } = await signIn(finalEmail, password)
    
    if (signInError) {
      setError(signInError)
      setLoading(false)
      return
    }

    // "Après connexion, si le compte n'est pas admin, afficher « Accès refusé » et le déconnecter."
    if (role !== 'admin') {
      await signOut()
      setError('Accès refusé. Ce compte ne dispose pas des privilèges administrateur.')
      setLoading(false)
      return
    }

    setLoading(false)
    navigate(from)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-900 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-neutral-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-neutral-700">
            <Shield className="w-8 h-8 text-neutral-400" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Administration</h1>
          <p className="text-neutral-400 mt-2 text-sm">Espace strictement réservé</p>
        </div>

        <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6 sm:p-8 shadow-2xl">
          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2">Identifiant</label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-neutral-500 transition-colors"
                placeholder="admin"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 text-white pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:border-neutral-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-white text-black font-semibold rounded-xl py-3 mt-2 hover:bg-neutral-200 transition-colors">
              {loading ? 'Vérification…' : 'Accéder au portail'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
