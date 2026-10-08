import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Scissors, CheckCircle2, XCircle, Clock, Shield,
  LayoutDashboard, LogOut, Menu, X, MapPin, Phone, Search, Filter, Image as ImageIcon
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Salon, Profile } from '@/types'

/**
 * 🔒 SÉCURITÉ :
 * Bien que cette route soit protégée côté client (via ProtectedRoute qui vérifie role === 'admin'),
 * la VRAIE sécurité réside dans les règles RLS de la base de données (définies dans la migration 002).
 * Un utilisateur malveillant ne pourra ni lire les données admin ni modifier le statut d'un salon
 * même s'il parvient à afficher cette page en modifiant le code localement.
 */

type Tab = 'overview' | 'pending' | 'salons'

export default function AdminDashboardPage() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Data
  const [stats, setStats] = useState({ clients: 0, activeSalons: 0, pendingSalons: 0 })
  const [salons, setSalons] = useState<Salon[]>([])
  
  // Filters & State
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSalonId, setSelectedSalonId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const [
      { count: clientsCount },
      { count: activeCount },
      { count: pendingCount },
      { data: salonsData }
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client'),
      supabase.from('salons').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('salons').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('salons').select('*').order('created_at', { ascending: false })
    ])

    setStats({
      clients: clientsCount || 0,
      activeSalons: activeCount || 0,
      pendingSalons: pendingCount || 0,
    })
    setSalons(salonsData as Salon[] || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const updateSalonStatus = async (id: string, status: Salon['status'], reason: string | null = null) => {
    const { error } = await supabase
      .from('salons')
      .update({ 
        status, 
        rejection_reason: reason,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id)

    if (!error) {
      fetchData() // Refresh data to update stats and lists
      setShowRejectModal(false)
      setRejectionReason('')
      setSelectedSalonId(null)
    } else {
      alert(`Erreur: ${error.message}`)
    }
  }

  const openRejectModal = (id: string) => {
    setSelectedSalonId(id)
    setShowRejectModal(true)
  }

  const confirmReject = () => {
    if (!rejectionReason.trim()) {
      alert("Le motif de refus est obligatoire.")
      return
    }
    if (selectedSalonId) {
      updateSalonStatus(selectedSalonId, 'rejected', rejectionReason)
    }
  }

  // Derived lists
  const pendingSalonsList = salons.filter(s => s.status === 'pending')
  const filteredSalons = salons.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return s.name.toLowerCase().includes(q) || (s.city || '').toLowerCase().includes(q)
    }
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-neutral-200 p-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary-600" />
          <span className="font-bold text-neutral-900">Admin</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-neutral-500">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-10 w-64 bg-white border-r border-neutral-200 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 hidden md:flex items-center gap-2">
          <Shield className="w-7 h-7 text-primary-600" />
          <span className="font-bold text-xl text-neutral-900">Administration</span>
        </div>
        
        <nav className="p-4 space-y-2 flex-1">
          <button
            onClick={() => { setTab('overview'); setMobileMenuOpen(false) }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              tab === 'overview' ? 'bg-primary-50 text-primary-700' : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" /> Vue d'ensemble
          </button>
          
          <button
            onClick={() => { setTab('pending'); setMobileMenuOpen(false) }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              tab === 'pending' ? 'bg-primary-50 text-primary-700' : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5" /> Demandes
            </div>
            {stats.pendingSalons > 0 && (
              <span className="bg-amber-100 text-amber-700 py-0.5 px-2 rounded-full text-xs">
                {stats.pendingSalons}
              </span>
            )}
          </button>
          
          <button
            onClick={() => { setTab('salons'); setMobileMenuOpen(false) }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              tab === 'salons' ? 'bg-primary-50 text-primary-700' : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <Scissors className="w-5 h-5" /> Tous les salons
          </button>
        </nav>

        <div className="p-4 border-t border-neutral-200 mt-auto md:absolute md:bottom-0 md:w-full bg-white">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 min-w-0 max-h-screen overflow-y-auto">
        
        {/* TAB : OVERVIEW */}
        {tab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-neutral-900">Vue d'ensemble</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Demandes en attente - Bien visible */}
              <div className="card p-6 bg-gradient-to-br from-amber-500 to-amber-600 text-white relative overflow-hidden shadow-lg shadow-amber-500/20">
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4 opacity-90">
                    <Clock className="w-6 h-6" />
                    <h3 className="font-medium text-lg">Demandes en attente</h3>
                  </div>
                  <div className="text-5xl font-bold mb-4">{stats.pendingSalons}</div>
                  <button 
                    onClick={() => setTab('pending')}
                    className="inline-flex items-center gap-2 text-sm font-medium bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition"
                  >
                    Voir les demandes
                  </button>
                </div>
                <Clock className="absolute -right-6 -bottom-6 w-40 h-40 opacity-10" />
              </div>

              {/* Salons actifs */}
              <div className="card p-6 border-l-4 border-l-green-500">
                <div className="flex items-center gap-3 mb-2 text-neutral-500">
                  <Scissors className="w-5 h-5 text-green-500" />
                  <h3 className="font-medium">Salons actifs</h3>
                </div>
                <div className="text-4xl font-bold text-neutral-900">{stats.activeSalons}</div>
              </div>

              {/* Clientes inscrites */}
              <div className="card p-6 border-l-4 border-l-blue-500">
                <div className="flex items-center gap-3 mb-2 text-neutral-500">
                  <Users className="w-5 h-5 text-blue-500" />
                  <h3 className="font-medium">Clientes inscrites</h3>
                </div>
                <div className="text-4xl font-bold text-neutral-900">{stats.clients}</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB : PENDING REQUESTS */}
        {tab === 'pending' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-neutral-900">Demandes d'inscription</h2>
            
            {pendingSalonsList.length === 0 ? (
              <div className="card p-12 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-900">Toutes les demandes ont été traitées</h3>
                <p className="text-neutral-500 mt-2">Aucun salon en attente de validation.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingSalonsList.map(salon => (
                  <div key={salon.id} className="card overflow-hidden">
                    <div className="p-6 md:p-8">
                      <div className="flex flex-col md:flex-row justify-between gap-6">
                        
                        {/* Infos principales */}
                        <div className="flex-1 space-y-4">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-xl font-bold text-neutral-900">{salon.name}</h3>
                              <span className="badge bg-amber-100 text-amber-700">En attente</span>
                            </div>
                            <p className="text-neutral-500 text-sm">Soumis le {new Date(salon.created_at).toLocaleDateString('fr-FR')}</p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-neutral-400 mb-1">Responsable</p>
                              <p className="font-medium text-neutral-900">{salon.manager_name || 'Non renseigné'}</p>
                            </div>
                            <div>
                              <p className="text-neutral-400 mb-1">Localisation</p>
                              <p className="font-medium text-neutral-900 flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-neutral-400" /> 
                                {salon.city} {salon.district ? `- ${salon.district}` : ''}
                              </p>
                            </div>
                            <div>
                              <p className="text-neutral-400 mb-1">Contact</p>
                              <p className="font-medium text-neutral-900 flex items-center gap-1.5">
                                <Phone className="w-4 h-4 text-neutral-400" />
                                {salon.phone} {salon.whatsapp ? `(WA: ${salon.whatsapp})` : ''}
                              </p>
                            </div>
                            <div>
                              <p className="text-neutral-400 mb-1">Catégories</p>
                              <div className="flex flex-wrap gap-1.5">
                                {salon.categories?.map((cat, i) => (
                                  <span key={i} className="bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full text-xs">
                                    {cat}
                                  </span>
                                )) || <span className="text-neutral-500">Aucune</span>}
                              </div>
                            </div>
                          </div>

                          {salon.description && (
                            <div>
                              <p className="text-neutral-400 text-sm mb-1">Description</p>
                              <p className="text-sm text-neutral-700 bg-neutral-50 p-3 rounded-xl">{salon.description}</p>
                            </div>
                          )}

                          {salon.proof_url && (
                            <div>
                              <p className="text-neutral-400 text-sm mb-1">Lien fourni (RS)</p>
                              <a href={salon.proof_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 text-sm hover:underline">
                                {salon.proof_url}
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Photos */}
                        <div className="md:w-72 flex-shrink-0">
                          <p className="text-neutral-400 text-sm mb-2 flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4" /> Photos du salon
                          </p>
                          {salon.photos && salon.photos.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                              {salon.photos.map((photo, i) => (
                                <a key={i} href={photo} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-lg overflow-hidden border border-neutral-200 hover:opacity-90 transition">
                                  <img src={photo} alt="Salon" className="w-full h-full object-cover" />
                                </a>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-neutral-50 rounded-xl aspect-video flex items-center justify-center text-neutral-400 text-sm border border-neutral-200">
                              Aucune photo
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                    
                    {/* Actions de validation */}
                    <div className="bg-neutral-50 border-t border-neutral-200 p-4 md:px-8 flex flex-wrap gap-3 justify-end">
                      <button 
                        onClick={() => openRejectModal(salon.id)}
                        className="btn-secondary text-red-600 hover:text-red-700 hover:border-red-200 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4" /> Refuser
                      </button>
                      <button 
                        onClick={() => updateSalonStatus(salon.id, 'approved')}
                        className="btn-primary bg-green-600 hover:bg-green-700 shadow-green-600/20"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approuver le salon
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB : TOUS LES SALONS */}
        {tab === 'salons' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-neutral-900">Gestion des salons</h2>
            
            {/* Filtres et recherche */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, ville..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-10"
                />
              </div>
              <div className="relative w-full md:w-64">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input pl-10 appearance-none bg-white"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="approved">Approuvés</option>
                  <option value="pending">En attente</option>
                  <option value="suspended">Suspendus</option>
                  <option value="rejected">Refusés</option>
                </select>
              </div>
            </div>

            {/* Liste */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-neutral-50 text-neutral-500 border-b border-neutral-200">
                    <tr>
                      <th className="px-6 py-4 font-medium">Nom du salon</th>
                      <th className="px-6 py-4 font-medium">Localisation</th>
                      <th className="px-6 py-4 font-medium">Contact</th>
                      <th className="px-6 py-4 font-medium">Statut</th>
                      <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredSalons.map(salon => (
                      <tr key={salon.id} className="hover:bg-neutral-50/50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-neutral-900">{salon.name}</div>
                          <div className="text-xs text-neutral-500 mt-1">{salon.manager_name}</div>
                        </td>
                        <td className="px-6 py-4 text-neutral-600">
                          {salon.city}
                        </td>
                        <td className="px-6 py-4 text-neutral-600">
                          {salon.phone}
                        </td>
                        <td className="px-6 py-4">
                          {salon.status === 'approved' && <span className="badge bg-green-100 text-green-700">Approuvé</span>}
                          {salon.status === 'pending' && <span className="badge bg-amber-100 text-amber-700">En attente</span>}
                          {salon.status === 'suspended' && <span className="badge bg-orange-100 text-orange-700">Suspendu</span>}
                          {salon.status === 'rejected' && <span className="badge bg-red-100 text-red-700">Refusé</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {salon.status === 'approved' ? (
                            <button 
                              onClick={() => updateSalonStatus(salon.id, 'suspended', 'Suspendu par l\'administrateur.')}
                              className="text-orange-600 hover:text-orange-800 font-medium text-xs px-3 py-1.5 rounded-lg hover:bg-orange-50 transition"
                            >
                              Suspendre
                            </button>
                          ) : salon.status === 'suspended' ? (
                            <button 
                              onClick={() => updateSalonStatus(salon.id, 'approved')}
                              className="text-green-600 hover:text-green-800 font-medium text-xs px-3 py-1.5 rounded-lg hover:bg-green-50 transition"
                            >
                              Réactiver
                            </button>
                          ) : salon.status === 'rejected' ? (
                            <button 
                              onClick={() => updateSalonStatus(salon.id, 'pending')}
                              className="text-amber-600 hover:text-amber-800 font-medium text-xs px-3 py-1.5 rounded-lg hover:bg-amber-50 transition"
                            >
                              Re-examiner
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                    {filteredSalons.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                          Aucun salon trouvé correspondant à vos critères.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal Motif de Refus */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="card w-full max-w-md p-6 animate-scale-in">
            <h3 className="text-xl font-bold text-neutral-900 mb-2">Motif du refus</h3>
            <p className="text-neutral-500 text-sm mb-4">
              Ce motif sera affiché au propriétaire du salon pour qu'il puisse corriger son dossier.
            </p>
            <textarea
              className="input min-h-[100px] mb-6"
              placeholder="Ex: Les photos ne sont pas claires, ou la ville n'est pas desservie..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectionReason('')
                }}
                className="btn-ghost"
              >
                Annuler
              </button>
              <button 
                onClick={confirmReject}
                className="btn-primary bg-red-600 hover:bg-red-700 shadow-red-600/20"
              >
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
