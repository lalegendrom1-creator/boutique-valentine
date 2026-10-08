import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, AlertCircle, Scissors, ShoppingBag } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types'

export default function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('client')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signUp(email, password, name, role)
    setLoading(false)
    if (error) {
      setError(error)
    } else {
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-neutral-900">Inscription</h1>
          <p className="text-neutral-500 mt-2">Rejoignez la communauté BeautyNear</p>
        </div>

        <div className="card p-8">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="label">Je m'inscris en tant que</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('client')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  role === 'client'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-neutral-200 hover:border-neutral-300 text-neutral-600'
                }`}
              >
                <ShoppingBag className="w-6 h-6" />
                <span className="text-sm font-medium">Client</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('salon_owner')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  role === 'salon_owner'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-neutral-200 hover:border-neutral-300 text-neutral-600'
                }`}
              >
                <Scissors className="w-6 h-6" />
                <span className="text-sm font-medium">Propriétaire de salon</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Nom complet</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input pl-10"
                  placeholder="Votre nom"
                />
              </div>
            </div>

            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="vous@exemple.com"
                />
              </div>
            </div>

            <div>
              <label className="label">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="Minimum 6 caractères"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Création du compte…' : 'Créer mon compte'}
            </button>
          </form>

          <p className="text-center text-sm text-neutral-500 mt-6">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
