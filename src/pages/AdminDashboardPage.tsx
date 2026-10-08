import { useState, useEffect } from 'react'
import { Users, Scissors, Calendar, Star, CheckCircle2, XCircle, Clock, Shield, LayoutDashboard } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Salon, Profile, Review } from '@/types'

type Tab = 'overview' | 'salons' | 'users' | 'reviews'

export default function AdminDashboardPage() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState({ users: 0, salons: 0, pending: 0, appointments: 0, reviews: 0 })
  const [salons, setSalons] = useState<Salon[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [reviews, setReviews] = useState<(Review & { profiles: { name: string }; salons: { name: string } })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('salons').select('*', { count: 'exact', head: true }),
      supabase.from('salons').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('appointments').select('*', { count: 'exact', head: true }),
      supabase.from('reviews').select('*', { count: 'exact', head: true }),
      supabase.from('salons').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('reviews').select('*, profiles(name), salons(name)').order('created_at', { ascending: false }).limit(50),
    ]).then(([u, s, p, a, r, salonsData, usersData, reviewsData]) => {
      setStats({
        users: u.count || 0,
        salons: s.count || 0,
        pending: p.count || 0,
        appointments: a.count || 0,
        reviews: r.count || 0,
      })
      setSalons(salonsData.data || [])
      setUsers(usersData.data || [])
      setReviews(reviewsData.data as any || [])
      setLoading(false)
    })
  }, [])

  const updateSalonStatus = async (id: string, status: string) => {
    await supabase.from('salons').update({ status }).eq('id', id)
    setSalons(prev => prev.map(s => s.id === id ? { ...s, status: status as any } : s))
  }

  const deleteReview = async (id: string) => {
    await supabase.from('reviews').delete().eq('id', id)
    setReviews(prev => prev.filter(r => r.id !== id))
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
    { id: 'salons', label: 'Salons', icon: Scissors },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'reviews', label: 'Avis', icon: Star },
  ]

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-6 h-6 text-primary-600" />
          <h1 className="font-display text-2xl font-bold text-neutral-900">Administration</h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-60 flex-shrink-0">
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

          <div className="flex-1 min-w-0">
            {tab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <StatCard icon={Users} label="Utilisateurs" value={stats.users} color="bg-primary-100 text-primary-700" />
                  <StatCard icon={Scissors} label="Salons" value={stats.salons} color="bg-blue-100 text-blue-700" />
                  <StatCard icon={Clock} label="En attente" value={stats.pending} color="bg-amber-100 text-amber-700" />
                  <StatCard icon={Calendar} label="Rendez-vous" value={stats.appointments} color="bg-green-100 text-green-700" />
                  <StatCard icon={Star} label="Avis" value={stats.reviews} color="bg-accent-100 text-accent-700" />
                </div>

                <div className="card p-6">
                  <h2 className="font-semibold text-neutral-900 mb-4">Salons en attente de validation</h2>
                  {salons.filter(s => s.status === 'pending').length === 0 ? (
                    <p className="text-neutral-500 text-sm">Aucun salon en attente.</p>
                  ) : (
                    <div className="space-y-2">
                      {salons.filter(s => s.status === 'pending').map(s => (
                        <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-50">
                          <div>
                            <p className="font-medium text-sm text-neutral-900">{s.name}</p>
                            <p className="text-xs text-neutral-500">{s.city || ''} {s.neighborhood || ''}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => updateSalonStatus(s.id, 'approved')} className="btn-primary text-xs px-3 py-1.5"><CheckCircle2 className="w-3 h-3" /> Approuver</button>
                            <button onClick={() => updateSalonStatus(s.id, 'rejected')} className="btn-secondary text-xs px-3 py-1.5"><XCircle className="w-3 h-3" /> Refuser</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'salons' && (
              <div>
                <h2 className="font-semibold text-neutral-900 mb-4">Tous les salons</h2>
                <div className="space-y-2">
                  {salons.map(s => (
                    <div key={s.id} className="card p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-neutral-900">{s.name}</p>
                        <p className="text-sm text-neutral-500">{s.city || ''} {s.neighborhood || ''}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <select
                          value={s.status}
                          onChange={e => updateSalonStatus(s.id, e.target.value)}
                          className="text-sm rounded-lg border border-neutral-200 px-3 py-1.5 focus:outline-none focus:border-primary-400"
                        >
                          <option value="pending">En attente</option>
                          <option value="approved">Approuvé</option>
                          <option value="suspended">Suspendu</option>
                          <option value="rejected">Refusé</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'users' && (
              <div>
                <h2 className="font-semibold text-neutral-900 mb-4">Utilisateurs</h2>
                <div className="card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50 text-neutral-500">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">Nom</th>
                        <th className="text-left px-4 py-3 font-medium">Email</th>
                        <th className="text-left px-4 py-3 font-medium">Rôle</th>
                        <th className="text-left px-4 py-3 font-medium">Inscrit le</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-neutral-50">
                          <td className="px-4 py-3 font-medium text-neutral-900">{u.name || '—'}</td>
                          <td className="px-4 py-3 text-neutral-600">{u.email}</td>
                          <td className="px-4 py-3">
                            <span className={`badge ${u.role === 'admin' ? 'bg-primary-100 text-primary-700' : u.role === 'salon_owner' ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-neutral-600'}`}>
                              {u.role === 'admin' ? 'Admin' : u.role === 'salon_owner' ? 'Propriétaire' : 'Client'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-neutral-500">{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'reviews' && (
              <div>
                <h2 className="font-semibold text-neutral-900 mb-4">Avis signalés / modération</h2>
                <div className="space-y-3">
                  {reviews.map(r => (
                    <div key={r.id} className="card p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm text-neutral-900">{r.profiles?.name || 'Anonyme'} — {r.salons?.name || ''}</p>
                          <p className="text-xs text-neutral-400">{new Date(r.created_at).toLocaleDateString('fr-FR')} — {r.rating}/5</p>
                        </div>
                        <button onClick={() => deleteReview(r.id)} className="text-red-500 hover:text-red-700 text-sm">Supprimer</button>
                      </div>
                      {r.comment && <p className="text-sm text-neutral-600">{r.comment}</p>}
                    </div>
                  ))}
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
