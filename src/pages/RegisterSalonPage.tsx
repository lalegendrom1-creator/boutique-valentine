import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scissors, MapPin, Phone, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function RegisterSalonPage() {
  const { session, profile } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '', description: '', phone: '', whatsapp: '', address: '',
    city: '', neighborhood: '', latitude: '', longitude: '', logo: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!session) {
    navigate('/login')
    return null
  }

  if (profile && profile.role !== 'salon_owner') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="card p-8 max-w-md text-center">
          <Scissors className="w-12 h-12 text-primary-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-neutral-900 mb-2">Compte propriétaire requis</h1>
          <p className="text-neutral-500 mb-6">Vous devez créer un compte propriétaire de salon pour inscrire votre établissement.</p>
          <button onClick={() => navigate('/register')} className="btn-primary">Créer un compte propriétaire</button>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.from('salons').insert({
      owner_id: session!.user.id,
      name: form.name,
      description: form.description || null,
      phone: form.phone || null,
      whatsapp: form.whatsapp || null,
      address: form.address || null,
      city: form.city || null,
      neighborhood: form.neighborhood || null,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      logo: form.logo || null,
      status: 'pending',
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="card p-8 max-w-md text-center animate-scale-in">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Salon créé !</h1>
          <p className="text-neutral-500 mb-6">Votre salon est en attente de validation par un administrateur. Vous serez notifié dès qu'il sera approuvé.</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">Aller au tableau de bord</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-neutral-900">Inscrire mon salon</h1>
          <p className="text-neutral-500 mt-2">Renseignez les informations de votre établissement</p>
        </div>

        <div className="card p-6 sm:p-8">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div><label className="label">Nom du salon *</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" placeholder="Mon Salon de Beauté" /></div>
            <div><label className="label">Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input min-h-[80px]" placeholder="Décrivez votre salon…" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="label">Téléphone</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input" placeholder="+228 90 00 00 00" /></div>
              <div><label className="label">WhatsApp</label><input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} className="input" placeholder="22890000000" /></div>
            </div>
            <div><label className="label">Adresse</label><input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="input" placeholder="Rue, numéro…" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="label">Ville</label><input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="input" placeholder="Lomé" /></div>
              <div><label className="label">Quartier</label><input value={form.neighborhood} onChange={e => setForm({ ...form, neighborhood: e.target.value })} className="input" placeholder="Agoè" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Latitude</label><input type="number" step="any" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} className="input" placeholder="6.1725" /></div>
              <div><label className="label">Longitude</label><input type="number" step="any" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} className="input" placeholder="1.2314" /></div>
            </div>
            <div><label className="label">Logo (URL)</label><input value={form.logo} onChange={e => setForm({ ...form, logo: e.target.value })} className="input" placeholder="https://…" /></div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Création…' : 'Inscrire mon salon'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
