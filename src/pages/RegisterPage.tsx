import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User, Mail, Lock, AlertCircle, Scissors, ShoppingBag,
  CheckCircle2, ArrowLeft, Eye, EyeOff,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types'

type Step = 'choice' | 'form' | 'confirm_email'

export default function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [role, setRole] = useState<UserRole>('client')
  const [step, setStep] = useState<Step>('choice')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleRoleChoice = (chosen: UserRole) => {
    setRole(chosen)
    setStep('form')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error, requiresEmailConfirmation } = await signUp(email, password, name, role)
    setLoading(false)
    if (error) {
      setError(error)
      return
    }
    if (requiresEmailConfirmation) {
      setStep('confirm_email')
    } else {
      navigate(role === 'salon' ? '/register-salon' : '/')
    }
  }

  /* ── Écran : confirmation d'email ── */
  if (step === 'confirm_email') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-5">
              <Mail className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-3">Vérifiez votre boîte mail</h1>
            <p className="text-neutral-500 text-sm leading-relaxed mb-2">
              Un lien de confirmation a été envoyé à <span className="font-semibold text-neutral-700">{email}</span>.
            </p>
            {role === 'salon' ? (
              <p className="text-neutral-500 text-sm leading-relaxed mb-6">
                Après confirmation, <strong>connectez-vous</strong> pour compléter votre dossier salon.
              </p>
            ) : (
              <p className="text-neutral-500 text-sm leading-relaxed mb-6">
                Cliquez sur le lien pour activer votre compte.
              </p>
            )}
            <Link to="/login" className="btn-primary w-full inline-flex justify-center">
              Aller à la connexion
            </Link>
          </div>
        </div>
      </div>
    )
  }

  /* ── Écran : formulaire ── */
  if (step === 'form') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 px-4 py-12">
        <div className="w-full max-w-md">
          {/* En-tête */}
          <div className="text-center mb-8">
            <button
              onClick={() => { setStep('choice'); setError(null) }}
              className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium mb-4 ${
              role === 'salon'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-accent-100 text-accent-700'
            }`}>
              {role === 'salon' ? <Scissors className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
              {role === 'salon' ? 'Propriétaire de salon' : 'Cliente'}
            </div>
            <h1 className="font-display text-3xl font-bold text-neutral-900">Créer mon compte</h1>
          </div>

          <div className="card p-8">
            {error && (
              <div className="mb-5 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Nom */}
              <div>
                <label className="label">Nom complet</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    id="register-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input pl-10"
                    placeholder="Votre nom complet"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    id="register-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-10"
                    placeholder="vous@exemple.com"
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <label className="label">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-10 pr-10"
                    placeholder="Minimum 6 caractères"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {role === 'salon' && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
                  Après la création de votre compte, vous complèterez votre dossier salon (photos, horaires, etc.).
                </div>
              )}

              <button
                id="register-submit"
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
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

  /* ── Écran : choix du rôle ── */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl font-bold text-neutral-900">Rejoindre BeautyNear</h1>
          <p className="text-neutral-500 mt-2">Choisissez votre profil pour commencer</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Carte : Cliente */}
          <button
            id="register-choice-client"
            type="button"
            onClick={() => handleRoleChoice('client')}
            className="group card p-6 text-left hover:border-accent-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-accent-100 flex items-center justify-center group-hover:bg-accent-200 transition-colors flex-shrink-0">
                <ShoppingBag className="w-7 h-7 text-accent-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-neutral-900 text-lg mb-1">Je suis une cliente</div>
                <div className="text-sm text-neutral-500">Trouvez des salons, réservez et gérez vos rendez-vous</div>
              </div>
              <ArrowLeft className="w-5 h-5 text-neutral-300 group-hover:text-accent-500 rotate-180 transition-colors" />
            </div>
          </button>

          {/* Carte : Salon */}
          <button
            id="register-choice-salon"
            type="button"
            onClick={() => handleRoleChoice('salon')}
            className="group card p-6 text-left hover:border-primary-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition-colors flex-shrink-0">
                <Scissors className="w-7 h-7 text-primary-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-neutral-900 text-lg mb-1">J'ai un salon</div>
                <div className="text-sm text-neutral-500">Inscrivez votre salon et développez votre clientèle</div>
              </div>
              <ArrowLeft className="w-5 h-5 text-neutral-300 group-hover:text-primary-500 rotate-180 transition-colors" />
            </div>
          </button>
        </div>

        <p className="text-center text-sm text-neutral-500 mt-8">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
