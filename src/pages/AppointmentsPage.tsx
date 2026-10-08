import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Clock, Scissors, ChevronRight, CheckCircle2, XCircle, AlertCircle, Hourglass } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Appointment, Salon, Service } from '@/types'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'En attente', color: 'bg-amber-50 text-amber-700', icon: Hourglass },
  confirmed: { label: 'Confirmé', color: 'bg-green-50 text-green-700', icon: CheckCircle2 },
  rejected: { label: 'Refusé', color: 'bg-red-50 text-red-700', icon: XCircle },
  cancelled: { label: 'Annulé', color: 'bg-neutral-100 text-neutral-500', icon: XCircle },
  completed: { label: 'Terminé', color: 'bg-blue-50 text-blue-700', icon: CheckCircle2 },
  no_show: { label: 'Absent', color: 'bg-red-50 text-red-700', icon: AlertCircle },
}

export default function AppointmentsPage() {
  const { session } = useAuth()
  const [appointments, setAppointments] = useState<(Appointment & { salons: Salon; services: Service })[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all')

  useEffect(() => {
    if (!session?.user) return
    supabase
      .from('appointments')
      .select('*, salons(name, city, logo), services(name, price, duration)')
      .eq('user_id', session.user.id)
      .order('date', { ascending: false })
      .then(({ data }) => {
        setAppointments(data as any || [])
        setLoading(false)
      })
  }, [session])

  const now = new Date().toISOString().split('T')[0]
  const filtered = appointments.filter(a => {
    if (filter === 'upcoming') return a.date >= now
    if (filter === 'past') return a.date < now
    return true
  })

  const cancelAppointment = async (id: string) => {
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id)
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a))
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-display text-2xl font-bold text-neutral-900 mb-6">Mes rendez-vous</h1>

        <div className="flex gap-2 mb-6">
          {(['all', 'upcoming', 'past'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === f ? 'bg-primary-600 text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-300'
              }`}
            >
              {f === 'all' ? 'Tous' : f === 'upcoming' ? 'À venir' : 'Passés'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-28" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <Calendar className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500 mb-4">Aucun rendez-vous {filter === 'upcoming' ? 'à venir' : filter === 'past' ? 'passé' : ''}.</p>
            <Link to="/search" className="btn-primary">Réserver un salon</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((apt) => {
              const status = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending
              const StatusIcon = status.icon
              return (
                <div key={apt.id} className="card p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <Scissors className="w-6 h-6 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-neutral-900 truncate">{apt.services?.name}</h3>
                      <span className={`badge ${status.color} flex-shrink-0`}>
                        <StatusIcon className="w-3 h-3" /> {status.label}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-500">{apt.salons?.name}</p>
                    <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(apt.date).toLocaleDateString('fr-FR')}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {apt.start_time.slice(0, 5)}</span>
                      <span>{apt.total_price} FCFA</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <Link to={`/salon/${apt.salon_id}`} className="text-sm text-primary-600 hover:underline flex items-center gap-0.5">
                      Voir <ChevronRight className="w-3 h-3" />
                    </Link>
                    {(apt.status === 'pending' || apt.status === 'confirmed') && apt.date >= now && (
                      <button
                        onClick={() => cancelAppointment(apt.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Annuler
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
