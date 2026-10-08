import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Scissors, Clock, Users, Calendar, Star, Settings, Plus, CheckCircle2, XCircle, Hourglass, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Salon, Service, Staff, BusinessHour, Appointment, Review } from '@/types'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'En attente', color: 'bg-amber-50 text-amber-700', icon: Hourglass },
  confirmed: { label: 'Confirmé', color: 'bg-green-50 text-green-700', icon: CheckCircle2 },
  rejected: { label: 'Refusé', color: 'bg-red-50 text-red-700', icon: XCircle },
  cancelled: { label: 'Annulé', color: 'bg-neutral-100 text-neutral-500', icon: XCircle },
  completed: { label: 'Terminé', color: 'bg-blue-50 text-blue-700', icon: CheckCircle2 },
  no_show: { label: 'Absent', color: 'bg-red-50 text-red-700', icon: XCircle },
}

type Tab = 'overview' | 'salon' | 'services' | 'staff' | 'hours' | 'appointments' | 'reviews' | 'settings'

export default function SalonDashboardPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')
  const [salon, setSalon] = useState<Salon | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [hours, setHours] = useState<BusinessHour[]>([])
  const [appointments, setAppointments] = useState<(Appointment & { services: Service; profiles: { name: string } })[]>([])
  const [reviews, setReviews] = useState<(Review & { profiles: { name: string } })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    supabase.from('salons').select('*').eq('owner_id', profile.id).maybeSingle().then(({ data }) => {
      setSalon(data as Salon | null)
      if (data) {
        Promise.all([
          supabase.from('services').select('*').eq('salon_id', data.id),
          supabase.from('staff').select('*').eq('salon_id', data.id),
          supabase.from('business_hours').select('*').eq('salon_id', data.id).order('day'),
          supabase.from('appointments').select('*, services(name, price), profiles(name)').eq('salon_id', data.id).order('date', { ascending: false }).limit(20),
          supabase.from('reviews').select('*, profiles(name)').eq('salon_id', data.id).order('created_at', { ascending: false }),
        ]).then(([s, st, h, a, r]) => {
          setServices(s.data || [])
          setStaff(st.data || [])
          setHours(h.data || [])
          setAppointments(a.data as any || [])
          setReviews(r.data as any || [])
          setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })
  }, [profile])

  const updateAppointmentStatus = async (id: string, status: string) => {
    await supabase.from('appointments').update({ status }).eq('id', id)
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: status as any } : a))
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
  }

  if (!salon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="card p-8 max-w-md text-center">
          <Scissors className="w-12 h-12 text-primary-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-neutral-900 mb-2">Aucun salon enregistré</h1>
          <p className="text-neutral-500 mb-6">Créez votre salon pour commencer à recevoir des réservations.</p>
          <Link to="/register-salon" className="btn-primary">Créer mon salon</Link>
        </div>
      </div>
    )
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'salon', label: 'Mon salon', icon: Scissors },
    { id: 'services', label: 'Services', icon: Star },
    { id: 'staff', label: 'Employés', icon: Users },
    { id: 'hours', label: 'Horaires', icon: Clock },
    { id: 'appointments', label: 'Rendez-vous', icon: Calendar },
    { id: 'reviews', label: 'Avis', icon: Star },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ]

  const today = new Date().toISOString().split('T')[0]
  const todayAppointments = appointments.filter(a => a.date === today)
  const pendingAppointments = appointments.filter(a => a.status === 'pending')
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="lg:w-60 flex-shrink-0">
            <div className="card p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center overflow-hidden">
                  {salon.logo ? <img src={salon.logo} alt="" className="w-full h-full object-cover" /> : <Scissors className="w-5 h-5 text-primary-600" />}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-neutral-900 truncate">{salon.name}</p>
                  <span className={`badge ${salon.status === 'approved' ? 'bg-green-50 text-green-700' : salon.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                    {salon.status === 'approved' ? 'Approuvé' : salon.status === 'pending' ? 'En attente' : salon.status === 'suspended' ? 'Suspendu' : 'Refusé'}
                  </span>
                </div>
              </div>
            </div>
            <nav className="card p-2 space-y-1">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tab === t.id ? 'bg-primary-50 text-primary-700' : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <t.icon className="w-4 h-4" /> {t.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {tab === 'overview' && (
              <div className="space-y-6">
                <h1 className="font-display text-2xl font-bold text-neutral-900">Tableau de bord</h1>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard icon={Calendar} label="Rendez-vous (total)" value={appointments.length} color="bg-primary-100 text-primary-700" />
                  <StatCard icon={Clock} label="Rendez-vous du jour" value={todayAppointments.length} color="bg-blue-100 text-blue-700" />
                  <StatCard icon={Hourglass} label="En attente" value={pendingAppointments.length} color="bg-amber-100 text-amber-700" />
                  <StatCard icon={Star} label="Note moyenne" value={avgRating > 0 ? avgRating.toFixed(1) : '—'} color="bg-accent-100 text-accent-700" />
                </div>

                <div className="card p-6">
                  <h2 className="font-semibold text-neutral-900 mb-4">Derniers rendez-vous</h2>
                  {appointments.length === 0 ? (
                    <p className="text-neutral-500 text-sm">Aucun rendez-vous pour le moment.</p>
                  ) : (
                    <div className="space-y-2">
                      {appointments.slice(0, 5).map(a => {
                        const s = STATUS_CONFIG[a.status] || STATUS_CONFIG.pending
                        return (
                          <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-neutral-50">
                            <div>
                              <p className="font-medium text-sm text-neutral-900">{a.services?.name}</p>
                              <p className="text-xs text-neutral-500">{a.profiles?.name} — {new Date(a.date).toLocaleDateString('fr-FR')} à {a.start_time.slice(0, 5)}</p>
                            </div>
                            <span className={`badge ${s.color}`}>{s.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'salon' && <SalonEditor salon={salon} onUpdate={setSalon} />}
            {tab === 'services' && <ServicesEditor salonId={salon.id} services={services} onUpdate={setServices} />}
            {tab === 'staff' && <StaffEditor salonId={salon.id} staff={staff} onUpdate={setStaff} />}
            {tab === 'hours' && <HoursEditor salonId={salon.id} hours={hours} onUpdate={setHours} />}
            {tab === 'appointments' && (
              <div>
                <h1 className="font-display text-2xl font-bold text-neutral-900 mb-6">Rendez-vous</h1>
                {appointments.length === 0 ? (
                  <div className="card p-8 text-center text-neutral-500">Aucun rendez-vous.</div>
                ) : (
                  <div className="space-y-3">
                    {appointments.map(a => {
                      const s = STATUS_CONFIG[a.status] || STATUS_CONFIG.pending
                      const StatusIcon = s.icon
                      return (
                        <div key={a.id} className="card p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold text-neutral-900">{a.services?.name}</p>
                              <p className="text-sm text-neutral-500">{a.profiles?.name} — {new Date(a.date).toLocaleDateString('fr-FR')} à {a.start_time.slice(0, 5)}</p>
                              <p className="text-xs text-neutral-400 mt-1">{a.total_price} FCFA</p>
                            </div>
                            <span className={`badge ${s.color}`}><StatusIcon className="w-3 h-3" /> {s.label}</span>
                          </div>
                          {a.status === 'pending' && (
                            <div className="flex gap-2 mt-3">
                              <button onClick={() => updateAppointmentStatus(a.id, 'confirmed')} className="btn-primary text-xs px-3 py-1.5">Accepter</button>
                              <button onClick={() => updateAppointmentStatus(a.id, 'rejected')} className="btn-secondary text-xs px-3 py-1.5">Refuser</button>
                            </div>
                          )}
                          {a.status === 'confirmed' && (
                            <div className="flex gap-2 mt-3">
                              <button onClick={() => updateAppointmentStatus(a.id, 'completed')} className="btn-primary text-xs px-3 py-1.5">Marquer terminé</button>
                              <button onClick={() => updateAppointmentStatus(a.id, 'no_show')} className="btn-secondary text-xs px-3 py-1.5">Absent</button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            {tab === 'reviews' && (
              <div>
                <h1 className="font-display text-2xl font-bold text-neutral-900 mb-6">Avis</h1>
                {reviews.length === 0 ? (
                  <div className="card p-8 text-center text-neutral-500">Aucun avis pour le moment.</div>
                ) : (
                  <div className="space-y-3">
                    {reviews.map(r => (
                      <ReviewCard key={r.id} review={r} salonId={salon.id} onUpdate={(resp) => setReviews(prev => prev.map(p => p.id === r.id ? { ...p, owner_response: resp } : p))} />
                    ))}
                  </div>
                )}
              </div>
            )}
            {tab === 'settings' && (
              <div>
                <h1 className="font-display text-2xl font-bold text-neutral-900 mb-6">Paramètres</h1>
                <div className="card p-6">
                  <p className="text-neutral-500 text-sm">Les paramètres avancés seront disponibles prochainement.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  return (
    <div className="card p-4">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-neutral-900">{value}</p>
      <p className="text-sm text-neutral-500">{label}</p>
    </div>
  )
}

function SalonEditor({ salon, onUpdate }: { salon: Salon; onUpdate: (s: Salon) => void }) {
  const [form, setForm] = useState(salon)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const { data } = await supabase.from('salons').update({
      name: form.name, description: form.description, phone: form.phone, whatsapp: form.whatsapp,
      address: form.address, city: form.city, neighborhood: form.neighborhood,
      latitude: form.latitude, longitude: form.longitude, logo: form.logo,
    }).eq('id', salon.id).select('*').maybeSingle()
    if (data) onUpdate(data as Salon)
    setSaving(false)
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-neutral-900 mb-6">Mon salon</h1>
      <div className="card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label">Nom du salon</label><input className="input" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Téléphone</label><input className="input" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label className="label">WhatsApp</label><input className="input" value={form.whatsapp || ''} onChange={e => setForm({ ...form, whatsapp: e.target.value })} /></div>
          <div><label className="label">Logo (URL)</label><input className="input" value={form.logo || ''} onChange={e => setForm({ ...form, logo: e.target.value })} /></div>
          <div><label className="label">Adresse</label><input className="input" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
          <div><label className="label">Ville</label><input className="input" value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
          <div><label className="label">Quartier</label><input className="input" value={form.neighborhood || ''} onChange={e => setForm({ ...form, neighborhood: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">Latitude</label><input type="number" step="any" className="input" value={form.latitude || ''} onChange={e => setForm({ ...form, latitude: parseFloat(e.target.value) })} /></div>
            <div><label className="label">Longitude</label><input type="number" step="any" className="input" value={form.longitude || ''} onChange={e => setForm({ ...form, longitude: parseFloat(e.target.value) })} /></div>
          </div>
        </div>
        <div><label className="label">Description</label><textarea className="input min-h-[100px]" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </div>
  )
}

function ServicesEditor({ salonId, services, onUpdate }: { salonId: string; services: Service[]; onUpdate: (s: Service[]) => void }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', price: 0, duration: 30 })

  const add = async () => {
    const { data } = await supabase.from('services').insert({ salon_id: salonId, ...form }).select('*').maybeSingle()
    if (data) { onUpdate([...services, data as Service]); setForm({ name: '', description: '', price: 0, duration: 30 }); setShowForm(false) }
  }

  const remove = async (id: string) => {
    await supabase.from('services').delete().eq('id', id)
    onUpdate(services.filter(s => s.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Services</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary"><Plus className="w-4 h-4" /> Ajouter</button>
      </div>
      {showForm && (
        <div className="card p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">Nom</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="label">Prix (FCFA)</label><input type="number" className="input" value={form.price} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) })} /></div>
            <div><label className="label">Durée (min)</label><input type="number" className="input" value={form.duration} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) })} /></div>
          </div>
          <div><label className="label">Description</label><input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <button onClick={add} className="btn-primary">Enregistrer le service</button>
        </div>
      )}
      <div className="space-y-2">
        {services.map(s => (
          <div key={s.id} className="card p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-neutral-900">{s.name}</p>
              <p className="text-sm text-neutral-500">{s.duration} min — {s.price} FCFA</p>
            </div>
            <button onClick={() => remove(s.id)} className="text-red-500 hover:text-red-700 text-sm">Supprimer</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function StaffEditor({ salonId, staff, onUpdate }: { salonId: string; staff: Staff[]; onUpdate: (s: Staff[]) => void }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', specialty: '', phone: '' })

  const add = async () => {
    const { data } = await supabase.from('staff').insert({ salon_id: salonId, ...form }).select('*').maybeSingle()
    if (data) { onUpdate([...staff, data as Staff]); setForm({ name: '', specialty: '', phone: '' }); setShowForm(false) }
  }

  const remove = async (id: string) => {
    await supabase.from('staff').delete().eq('id', id)
    onUpdate(staff.filter(s => s.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Employés</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary"><Plus className="w-4 h-4" /> Ajouter</button>
      </div>
      {showForm && (
        <div className="card p-4 mb-4 space-y-3">
          <div><label className="label">Nom</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Spécialité</label><input className="input" value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} /></div>
          <div><label className="label">Téléphone</label><input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          <button onClick={add} className="btn-primary">Enregistrer</button>
        </div>
      )}
      <div className="space-y-2">
        {staff.map(s => (
          <div key={s.id} className="card p-4 flex items-center justify-between">
            <div><p className="font-semibold text-neutral-900">{s.name}</p><p className="text-sm text-neutral-500">{s.specialty}</p></div>
            <button onClick={() => remove(s.id)} className="text-red-500 hover:text-red-700 text-sm">Supprimer</button>
          </div>
        ))}
      </div>
    </div>
  )
}

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

function HoursEditor({ salonId, hours, onUpdate }: { salonId: string; hours: BusinessHour[]; onUpdate: (h: BusinessHour[]) => void }) {
  const save = async (day: number, opening_time: string, closing_time: string, is_closed: boolean) => {
    const existing = hours.find(h => h.day === day)
    if (existing) {
      const { data } = await supabase.from('business_hours').update({ opening_time, closing_time, is_closed }).eq('id', existing.id).select('*').maybeSingle()
      if (data) onUpdate(hours.map(h => h.id === existing.id ? data as BusinessHour : h))
    } else {
      const { data } = await supabase.from('business_hours').insert({ salon_id: salonId, day, opening_time, closing_time, is_closed }).select('*').maybeSingle()
      if (data) onUpdate([...hours, data as BusinessHour].sort((a, b) => a.day - b.day))
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-neutral-900 mb-6">Horaires d'ouverture</h1>
      <div className="card p-4 space-y-3">
        {DAY_NAMES.map((dayName, day) => {
          const h = hours.find(h => h.day === day)
          return <HourRow key={day} day={day} dayName={dayName} hour={h} onSave={save} />
        })}
      </div>
    </div>
  )
}

function HourRow({ day, dayName, hour, onSave }: { day: number; dayName: string; hour?: BusinessHour; onSave: (day: number, o: string, c: string, closed: boolean) => void }) {
  const [opening, setOpening] = useState(hour?.opening_time?.slice(0, 5) || '09:00')
  const [closing, setClosing] = useState(hour?.closing_time?.slice(0, 5) || '18:00')
  const [closed, setClosed] = useState(hour?.is_closed || false)

  return (
    <div className="flex items-center gap-3 py-2 border-b border-neutral-100 last:border-0">
      <span className="w-28 text-sm font-medium text-neutral-700">{dayName}</span>
      <input type="time" value={opening} disabled={closed} onChange={e => setOpening(e.target.value)} className="input py-1.5 px-2 text-sm w-28" />
      <span className="text-neutral-400">-</span>
      <input type="time" value={closing} disabled={closed} onChange={e => setClosing(e.target.value)} className="input py-1.5 px-2 text-sm w-28" />
      <label className="flex items-center gap-2 text-sm text-neutral-600 ml-auto">
        <input type="checkbox" checked={closed} onChange={e => setClosed(e.target.checked)} className="rounded" /> Fermé
      </label>
      <button onClick={() => onSave(day, opening + ':00', closing + ':00', closed)} className="btn-secondary text-xs px-3 py-1.5">OK</button>
    </div>
  )
}

function ReviewCard({ review, salonId, onUpdate }: { review: Review & { profiles: { name: string } }; salonId: string; onUpdate: (resp: string) => void }) {
  const [responding, setResponding] = useState(false)
  const [response, setResponse] = useState(review.owner_response || '')

  const submit = async () => {
    await supabase.from('reviews').update({ owner_response: response }).eq('id', review.id)
    onUpdate(response)
    setResponding(false)
  }

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-medium">{review.profiles?.name?.charAt(0) || '?'}</div>
        <div>
          <p className="font-medium text-sm text-neutral-900">{review.profiles?.name || 'Anonyme'}</p>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'fill-accent-400 text-accent-400' : 'text-neutral-200'}`} />)}
          </div>
        </div>
      </div>
      {review.comment && <p className="text-sm text-neutral-600 mt-2">{review.comment}</p>}
      {review.owner_response && !responding ? (
        <div className="mt-3 ml-4 pl-4 border-l-2 border-primary-100">
          <p className="text-xs font-medium text-primary-700 mb-1">Votre réponse</p>
          <p className="text-sm text-neutral-600">{review.owner_response}</p>
          <button onClick={() => setResponding(true)} className="text-xs text-primary-600 hover:underline mt-1">Modifier</button>
        </div>
      ) : responding ? (
        <div className="mt-3">
          <textarea className="input min-h-[60px] text-sm" value={response} onChange={e => setResponse(e.target.value)} placeholder="Votre réponse…" />
          <div className="flex gap-2 mt-2">
            <button onClick={submit} className="btn-primary text-xs px-3 py-1.5">Publier</button>
            <button onClick={() => setResponding(false)} className="btn-secondary text-xs px-3 py-1.5">Annuler</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setResponding(true)} className="text-sm text-primary-600 hover:underline mt-2">Répondre</button>
      )}
    </div>
  )
}
