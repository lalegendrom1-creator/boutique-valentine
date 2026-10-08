import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Scissors, MapPin, Phone, AlertCircle, CheckCircle2,
  Clock, Image as ImageIcon, X, Upload, Loader2,
  XCircle, ArrowRight, Instagram,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Salon } from '@/types'

const CATEGORIES = [
  'Coiffure femme',
  'Coiffure homme / Barbier',
  'Tresses / Nattes / Extensions',
  'Perruques',
  'Esthétique / Soins du visage',
  'Manucure / Pédicure',
  'Épilation',
  'Massage / Bien-être',
  'Maquillage',
  'Soins capillaires',
]

type PageState = 'loading' | 'no_session' | 'wrong_role' | 'has_salon' | 'form'

export default function RegisterSalonPage() {
  const { session, profile } = useAuth()
  const navigate = useNavigate()

  const [pageState, setPageState] = useState<PageState>('loading')
  const [salon, setSalon] = useState<Salon | null>(null)

  // Form state
  const [form, setForm] = useState({
    name: '',
    city: '',
    district: '',
    address: '',
    phone: '',
    whatsapp: '',
    manager_name: '',
    description: '',
    opening_hours: '',
    proof_url: '',
  })
  const [categories, setCategories] = useState<string[]>([])
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ── Charger l'état initial ── */
  useEffect(() => {
    if (!profile) {
      if (session === null) setPageState('no_session')
      // else: still loading profile
      return
    }
    if (profile.role !== 'salon') {
      setPageState('wrong_role')
      return
    }
    // Chercher un salon existant
    supabase
      .from('salons')
      .select('*')
      .eq('owner_id', profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSalon(data as Salon)
          setPageState('has_salon')
        } else {
          setPageState('form')
        }
      })
  }, [profile, session])

  /* ── Gestion des photos ── */
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remaining = 4 - photoFiles.length
    const newFiles = files.slice(0, remaining)
    setPhotoFiles(prev => [...prev, ...newFiles])
    newFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setPhotoPreviews(prev => [...prev, ev.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removePhoto = (index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const toggleCategory = (cat: string) => {
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  /* ── Soumission du dossier ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return
    setFormError(null)
    setLoading(true)

    try {
      // 1. Upload des photos
      const photoUrls: string[] = []
      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i]
        const ext = file.name.split('.').pop()
        const path = `${session.user.id}/${Date.now()}-${i}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('salon-photos')
          .upload(path, file, { upsert: true })
        if (uploadError) throw new Error(`Erreur upload photo : ${uploadError.message}`)
        const { data: urlData } = supabase.storage
          .from('salon-photos')
          .getPublicUrl(path)
        photoUrls.push(urlData.publicUrl)
      }

      // 2. Insérer le salon
      const { error: insertError } = await supabase.from('salons').insert({
        owner_id: session.user.id,
        name: form.name,
        city: form.city || null,
        district: form.district || null,
        address: form.address || null,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        manager_name: form.manager_name || null,
        description: form.description || null,
        opening_hours: form.opening_hours || null,
        proof_url: form.proof_url || null,
        categories: categories.length > 0 ? categories : null,
        photos: photoUrls.length > 0 ? photoUrls : null,
        status: 'pending',
      })

      if (insertError) throw new Error(insertError.message)

      // 3. Recharger le salon
      const { data: newSalon } = await supabase
        .from('salons')
        .select('*')
        .eq('owner_id', session.user.id)
        .single()
      setSalon(newSalon as Salon)
      setPageState('has_salon')
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  /* ── États de la page ── */

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (pageState === 'no_session') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="card p-8 max-w-md text-center">
          <Scissors className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-neutral-900 mb-2">Connexion requise</h1>
          <p className="text-neutral-500 mb-6">Vous devez être connecté pour accéder à cette page.</p>
          <Link to="/login" className="btn-primary">Se connecter</Link>
        </div>
      </div>
    )
  }

  if (pageState === 'wrong_role') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="card p-8 max-w-md text-center">
          <Scissors className="w-12 h-12 text-primary-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-neutral-900 mb-2">Compte salon requis</h1>
          <p className="text-neutral-500 mb-6">
            Cette page est réservée aux propriétaires de salon. Créez un compte salon pour inscrire votre établissement.
          </p>
          <Link to="/register" className="btn-primary">Créer un compte salon</Link>
        </div>
      </div>
    )
  }

  if (pageState === 'has_salon' && salon) {
    /* ── Écran statut ── */
    const statusConfig = {
      pending: {
        icon: <Clock className="w-8 h-8 text-amber-500" />,
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        iconBg: 'bg-amber-100',
        title: 'Demande en cours de vérification',
        message: 'Votre dossier a bien été reçu. Notre équipe va l\'examiner dans les plus brefs délais. Vous serez notifié par email dès qu\'une décision sera prise.',
        badge: 'bg-amber-100 text-amber-700',
        badgeLabel: 'En attente',
      },
      approved: {
        icon: <CheckCircle2 className="w-8 h-8 text-green-600" />,
        bg: 'bg-green-50',
        border: 'border-green-200',
        iconBg: 'bg-green-100',
        title: 'Votre salon est validé !',
        message: 'Félicitations ! Votre salon est maintenant visible pour les clientes. Accédez à votre espace pour gérer vos services, vos horaires et vos réservations.',
        badge: 'bg-green-100 text-green-700',
        badgeLabel: 'Approuvé',
      },
      rejected: {
        icon: <XCircle className="w-8 h-8 text-red-500" />,
        bg: 'bg-red-50',
        border: 'border-red-200',
        iconBg: 'bg-red-100',
        title: 'Dossier refusé',
        message: 'Votre demande d\'inscription a été refusée.',
        badge: 'bg-red-100 text-red-700',
        badgeLabel: 'Refusé',
      },
      suspended: {
        icon: <AlertCircle className="w-8 h-8 text-orange-500" />,
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        iconBg: 'bg-orange-100',
        title: 'Salon suspendu',
        message: 'Votre salon a été suspendu temporairement. Contactez l\'administrateur pour plus d\'informations.',
        badge: 'bg-orange-100 text-orange-700',
        badgeLabel: 'Suspendu',
      },
    }

    const cfg = statusConfig[salon.status]

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 px-4 py-12">
        <div className="w-full max-w-lg">
          <div className={`card p-8 border-2 ${cfg.border}`}>
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full ${cfg.iconBg} flex items-center justify-center mx-auto mb-5`}>
                {cfg.icon}
              </div>
              <span className={`badge ${cfg.badge} mb-4 px-3 py-1 text-sm`}>{cfg.badgeLabel}</span>
              <h1 className="text-2xl font-bold text-neutral-900 mb-3 mt-2">{cfg.title}</h1>
              <p className="text-neutral-500 text-sm leading-relaxed mb-4">{cfg.message}</p>

              {/* Motif de refus */}
              {salon.status === 'rejected' && salon.rejection_reason && (
                <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-4 text-left">
                  <p className="text-sm font-semibold text-red-700 mb-1">Motif du refus :</p>
                  <p className="text-sm text-red-600">{salon.rejection_reason}</p>
                </div>
              )}

              {/* Infos du salon */}
              <div className="mt-6 rounded-xl bg-neutral-50 border border-neutral-200 p-4 text-left">
                <p className="text-xs text-neutral-400 uppercase tracking-wide font-medium mb-3">Votre salon</p>
                <div className="space-y-1.5">
                  <p className="font-semibold text-neutral-800">{salon.name}</p>
                  {salon.city && (
                    <p className="flex items-center gap-1.5 text-sm text-neutral-500">
                      <MapPin className="w-3.5 h-3.5" /> {salon.city}{salon.district ? `, ${salon.district}` : ''}
                    </p>
                  )}
                  {salon.phone && (
                    <p className="flex items-center gap-1.5 text-sm text-neutral-500">
                      <Phone className="w-3.5 h-3.5" /> {salon.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* CTA selon statut */}
              {salon.status === 'approved' && (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="btn-primary w-full mt-6"
                >
                  Accéder à mon espace <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ── Formulaire de dossier ── */
  return (
    <div className="min-h-screen bg-neutral-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* En-tête */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-1.5 text-sm font-medium text-primary-700 mb-4">
            <Scissors className="w-4 h-4" /> Inscription salon
          </div>
          <h1 className="font-display text-3xl font-bold text-neutral-900">Votre dossier salon</h1>
          <p className="text-neutral-500 mt-2 text-sm">Renseignez les informations de votre établissement</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {formError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {formError}
            </div>
          )}

          {/* ── Section : Informations générales ── */}
          <div className="card p-6">
            <h2 className="font-semibold text-neutral-900 mb-5 flex items-center gap-2">
              <Scissors className="w-4 h-4 text-primary-500" /> Informations générales
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">Nom du salon <span className="text-red-500">*</span></label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="Ex : Salon Beauté Divine"
                />
              </div>
              <div>
                <label className="label">Nom du responsable <span className="text-red-500">*</span></label>
                <input
                  required
                  value={form.manager_name}
                  onChange={e => setForm({ ...form, manager_name: e.target.value })}
                  className="input"
                  placeholder="Prénom et nom"
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="input min-h-[90px] resize-none"
                  placeholder="Présentez votre salon, votre ambiance, vos spécialités…"
                />
              </div>
            </div>
          </div>

          {/* ── Section : Localisation ── */}
          <div className="card p-6">
            <h2 className="font-semibold text-neutral-900 mb-5 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary-500" /> Localisation
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Ville <span className="text-red-500">*</span></label>
                  <input
                    required
                    value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })}
                    className="input"
                    placeholder="Ex : Lomé"
                  />
                </div>
                <div>
                  <label className="label">Quartier / Arrondissement</label>
                  <input
                    value={form.district}
                    onChange={e => setForm({ ...form, district: e.target.value })}
                    className="input"
                    placeholder="Ex : Agoè, Bè…"
                  />
                </div>
              </div>
              <div>
                <label className="label">Adresse complète</label>
                <input
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="input"
                  placeholder="Rue, numéro, point de repère…"
                />
              </div>
            </div>
          </div>

          {/* ── Section : Contact ── */}
          <div className="card p-6">
            <h2 className="font-semibold text-neutral-900 mb-5 flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary-500" /> Contact
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Téléphone <span className="text-red-500">*</span></label>
                <input
                  required
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="input"
                  placeholder="+228 90 00 00 00"
                />
              </div>
              <div>
                <label className="label">WhatsApp</label>
                <input
                  value={form.whatsapp}
                  onChange={e => setForm({ ...form, whatsapp: e.target.value })}
                  className="input"
                  placeholder="22890000000"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="label">Lien Facebook / Instagram</label>
              <div className="relative">
                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  value={form.proof_url}
                  onChange={e => setForm({ ...form, proof_url: e.target.value })}
                  className="input pl-10"
                  placeholder="https://instagram.com/monsalon"
                  type="url"
                />
              </div>
            </div>
          </div>

          {/* ── Section : Catégories ── */}
          <div className="card p-6">
            <h2 className="font-semibold text-neutral-900 mb-1 flex items-center gap-2">
              <Scissors className="w-4 h-4 text-primary-500" /> Catégories de services
            </h2>
            <p className="text-xs text-neutral-400 mb-4">Sélectionnez tout ce qui correspond à votre salon</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <label
                  key={cat}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    categories.includes(cat)
                      ? 'border-primary-400 bg-primary-50 text-primary-700'
                      : 'border-neutral-200 hover:border-neutral-300 text-neutral-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={categories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                  />
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                    categories.includes(cat)
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-neutral-300'
                  }`}>
                    {categories.includes(cat) && (
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <span className="text-sm">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ── Section : Horaires ── */}
          <div className="card p-6">
            <h2 className="font-semibold text-neutral-900 mb-5 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-500" /> Horaires d'ouverture
            </h2>
            <textarea
              value={form.opening_hours}
              onChange={e => setForm({ ...form, opening_hours: e.target.value })}
              className="input min-h-[90px] resize-none"
              placeholder="Ex : Lundi – Samedi : 8h à 19h&#10;Dimanche : Fermé"
            />
          </div>

          {/* ── Section : Photos ── */}
          <div className="card p-6">
            <h2 className="font-semibold text-neutral-900 mb-1 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary-500" /> Photos du salon
            </h2>
            <p className="text-xs text-neutral-400 mb-4">Jusqu'à 4 photos (JPG, PNG, WEBP)</p>

            {/* Grille de prévisualisation */}
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {photoPreviews.map((src, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100">
                    <img src={src} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photoFiles.length < 4 && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={handlePhotoChange}
                  id="salon-photos-input"
                />
                <label
                  htmlFor="salon-photos-input"
                  className="flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed border-neutral-300 rounded-xl p-6 cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-all text-neutral-400 hover:text-primary-600"
                >
                  <Upload className="w-7 h-7" />
                  <span className="text-sm font-medium">
                    Cliquez pour ajouter des photos
                  </span>
                  <span className="text-xs">
                    {4 - photoFiles.length} photo{4 - photoFiles.length > 1 ? 's' : ''} restante{4 - photoFiles.length > 1 ? 's' : ''}
                  </span>
                </label>
              </>
            )}
          </div>

          {/* ── Bouton de soumission ── */}
          <button
            id="salon-submit"
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-4 text-base"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Envoi du dossier…
              </>
            ) : (
              <>
                Soumettre mon dossier <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-neutral-400 pb-4">
            Votre dossier sera examiné par notre équipe avant d'être publié.
          </p>
        </form>
      </div>
    </div>
  )
}
