import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Scissors, CheckCircle2, XCircle, Clock, Shield,
  LayoutDashboard, LogOut, Menu, X, MapPin, Phone, Search, 
  Filter, Image as ImageIcon, AlertCircle, Edit, Star, Trash2,
  CalendarDays, TrendingUp, MessageSquare
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Salon, Profile } from '@/types'

/**
 * 🔒 SÉCURITÉ :
 * Bien que cette route soit protégée côté client (via ProtectedRoute qui vérifie role === 'admin'),
 * la VRAIE sécurité réside dans les règles RLS de la base de données (définies dans les migrations).
 * Un utilisateur malveillant ne pourra ni lire les données admin ni modifier le statut d'un salon
 * même s'il parvient à afficher cette page en modifiant le code localement.
 */

type Tab = 'overview' | 'pending' | 'salons'
type ActionModalType = 'reject' | 'correction' | 'suspend' | 'delete' | 'edit' | null

// Inactivité (30 minutes)
const INACTIVITY_TIMEOUT = 30 * 60 * 1000

export default function AdminDashboardPage() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Data
  const [salons, setSalons] = useState<Salon[]>([])
  const [clientsCount, setClientsCount] = useState(0)
  const [newClientsThisWeek, setNewClientsThisWeek] = useState(0)
  const [newSalonsThisWeek, setNewSalonsThisWeek] = useState(0)
  
  // Filters & State
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [cityFilter, setCityFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modal State
  const [modalType, setModalType] = useState<ActionModalType>(null)
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null)
  const [actionMessage, setActionMessage] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [editForm, setEditForm] = useState<Partial<Salon>>({})

  /* ── Balise noindex ── */
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'robots')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', 'noindex')
  }, [])

  /* ── Déconnexion automatique ── */
  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const resetTimer = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(async () => {
        await signOut()
        navigate('/login')
      }, INACTIVITY_TIMEOUT)
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    events.forEach(e => document.addEventListener(e, resetTimer))
    resetTimer()

    return () => {
      clearTimeout(timeoutId)
      events.forEach(e => document.removeEventListener(e, resetTimer))
    }
  }, [signOut, navigate])

  /* ── Fetch Data ── */
  const fetchData = useCallback(async () => {
    setLoading(true)
    
    // Calculate 7 days ago
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const weekAgoStr = oneWeekAgo.toISOString()

    const [
      { count: totalClients },
      { count: recentClients },
      { count: recentSalons },
      { data: salonsData }
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client').gte('created_at', weekAgoStr),
      supabase.from('salons').select('*', { count: 'exact', head: true }).gte('created_at', weekAgoStr),
      supabase.from('salons').select('*').order('created_at', { ascending: false })
    ])

    setClientsCount(totalClients || 0)
    setNewClientsThisWeek(recentClients || 0)
    setNewSalonsThisWeek(recentSalons || 0)
    setSalons(salonsData as Salon[] || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /* ── Derived Data ── */
  const stats = useMemo(() => {
    let approved = 0, pending = 0, rejected = 0, suspended = 0
    salons.forEach(s => {
      if (s.status === 'approved') approved++
      else if (s.status === 'pending') pending++
      else if (s.status === 'rejected') rejected++
      else if (s.status === 'suspended') suspended++
    })
    return { approved, pending, rejected, suspended }
  }, [salons])

  const pendingSalonsList = useMemo(() => {
    // Les plus anciens en premier pour traitement
    return salons.filter(s => s.status === 'pending').sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }, [salons])

  const recentSalonsList = useMemo(() => {
    // Les 5 plus récents
    return [...salons].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)
  }, [salons])

  const filteredSalons = useMemo(() => {
    return salons.filter(s => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false
      if (cityFilter !== 'all' && s.city !== cityFilter) return false
      if (categoryFilter !== 'all' && (!s.categories || !s.categories.includes(categoryFilter))) return false
      
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return s.name.toLowerCase().includes(q) || (s.city || '').toLowerCase().includes(q)
      }
      return true
    })
  }, [salons, statusFilter, cityFilter, categoryFilter, searchQuery])

  // Lists for filters
  const uniqueCities = useMemo(() => Array.from(new Set(salons.map(s => s.city).filter(Boolean))) as string[], [salons])
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>()
    salons.forEach(s => s.categories?.forEach(c => cats.add(c)))
    return Array.from(cats)
  }, [salons])

  /* ── Handlers ── */
  const closeModal = () => {
    setModalType(null)
    setSelectedSalon(null)
    setActionMessage('')
    setDeleteConfirmText('')
    setEditForm({})
  }

  const handleAction = async () => {
    if (!selectedSalon) return
    
    try {
      if (modalType === 'reject') {
        if (!actionMessage.trim()) return alert("Le motif de refus est obligatoire.")
        await supabase.from('salons').update({ status: 'rejected', rejection_reason: actionMessage, reviewed_at: new Date().toISOString() }).eq('id', selectedSalon.id)
      } 
      else if (modalType === 'correction') {
        if (!actionMessage.trim()) return alert("Le message est obligatoire.")
        // Reste pending, mais ajoute le message
        await supabase.from('salons').update({ correction_request: actionMessage, reviewed_at: new Date().toISOString() }).eq('id', selectedSalon.id)
      }
      else if (modalType === 'suspend') {
        if (!actionMessage.trim()) return alert("Le motif est obligatoire.")
        await supabase.from('salons').update({ status: 'suspended', suspension_reason: actionMessage, reviewed_at: new Date().toISOString() }).eq('id', selectedSalon.id)
      }
      else if (modalType === 'delete') {
        if (deleteConfirmText !== selectedSalon.name) return alert("Le nom saisi ne correspond pas.")
        await supabase.from('salons').delete().eq('id', selectedSalon.id)
      }
      else if (modalType === 'edit') {
        await supabase.from('salons').update({ 
          name: editForm.name,
          city: editForm.city,
          phone: editForm.phone,
          whatsapp: editForm.whatsapp,
        }).eq('id', selectedSalon.id)
      }

      fetchData()
      closeModal()
    } catch (e: any) {
      alert(`Erreur : ${e.message}`)
    }
  }

  const directAction = async (salonId: string, action: 'approve' | 'reactivate' | 'toggle_feature', currentFeaturedValue = false) => {
    try {
      if (action === 'approve') {
        await supabase.from('salons').update({ status: 'approved', rejection_reason: null, correction_request: null, suspension_reason: null, reviewed_at: new Date().toISOString() }).eq('id', salonId)
      } else if (action === 'reactivate') {
        await supabase.from('salons').update({ status: 'approved', suspension_reason: null, reviewed_at: new Date().toISOString() }).eq('id', salonId)
      } else if (action === 'toggle_feature') {
        await supabase.from('salons').update({ is_featured: !currentFeaturedValue }).eq('id', salonId)
      }
      fetchData()
    } catch (e: any) {
      alert(`Erreur : ${e.message}`)
    }
  }

  const removePhoto = async (salonId: string, photos: string[], photoToRemove: string) => {
    if (!window.confirm("Retirer cette photo ?")) return
    const newPhotos = photos.filter(p => p !== photoToRemove)
    await supabase.from('salons').update({ photos: newPhotos.length > 0 ? newPhotos : null }).eq('id', salonId)
    fetchData()
  }

  /* ── Renderers ── */
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
              <Clock className="w-5 h-5" /> Demandes d'inscription
            </div>
            {stats.pending > 0 && (
              <span className="bg-amber-100 text-amber-700 py-0.5 px-2 rounded-full text-xs font-bold shadow-sm border border-amber-200">
                {stats.pending}
              </span>
            )}
          </button>
          
          <button
            onClick={() => { setTab('salons'); setMobileMenuOpen(false) }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              tab === 'salons' ? 'bg-primary-50 text-primary-700' : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <Scissors className="w-5 h-5" /> Gestion des salons
          </button>
        </nav>

        <div className="p-4 border-t border-neutral-200 mt-auto md:absolute md:bottom-0 md:w-full bg-white">
          <button
            onClick={() => { signOut(); navigate('/login') }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 min-w-0 max-h-screen overflow-y-auto">
        
        {/* ========================================================= */}
        {/* TAB : OVERVIEW */}
        {/* ========================================================= */}
        {tab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-neutral-900">Tableau de bord</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Demandes en attente - Mises en avant */}
              <button 
                onClick={() => setTab('pending')}
                className="col-span-1 md:col-span-2 lg:col-span-4 card p-6 bg-gradient-to-br from-amber-500 to-amber-600 text-white relative overflow-hidden shadow-lg shadow-amber-500/20 text-left hover:scale-[1.01] transition-transform"
              >
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2 opacity-90">
                      <Clock className="w-6 h-6" />
                      <h3 className="font-medium text-lg">Demandes en attente</h3>
                    </div>
                    <div className="text-5xl font-bold">{stats.pending}</div>
                  </div>
                  <div className="hidden sm:block text-amber-100/50">
                    <Clock className="w-24 h-24" />
                  </div>
                </div>
              </button>

              {/* Salons */}
              <div className="card p-5 border-t-4 border-t-green-500">
                <p className="text-sm font-medium text-neutral-500 mb-1">Salons Approuvés</p>
                <p className="text-3xl font-bold text-neutral-900">{stats.approved}</p>
              </div>
              <div className="card p-5 border-t-4 border-t-red-500">
                <p className="text-sm font-medium text-neutral-500 mb-1">Salons Refusés</p>
                <p className="text-3xl font-bold text-neutral-900">{stats.rejected}</p>
              </div>
              <div className="card p-5 border-t-4 border-t-orange-500">
                <p className="text-sm font-medium text-neutral-500 mb-1">Salons Suspendus</p>
                <p className="text-3xl font-bold text-neutral-900">{stats.suspended}</p>
              </div>
              
              {/* Clientes */}
              <div className="card p-5 border-t-4 border-t-blue-500">
                <p className="text-sm font-medium text-neutral-500 mb-1">Clientes Inscrites</p>
                <p className="text-3xl font-bold text-neutral-900">{clientsCount}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Activité semaine */}
              <div className="card p-6">
                <h3 className="font-bold text-lg text-neutral-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary-500" /> Nouveautés cette semaine
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-3 text-blue-800">
                      <Users className="w-5 h-5" />
                      <span className="font-medium">Nouvelles clientes</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">+{newClientsThisWeek}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-primary-50 rounded-xl border border-primary-100">
                    <div className="flex items-center gap-3 text-primary-800">
                      <Scissors className="w-5 h-5" />
                      <span className="font-medium">Nouveaux salons inscrits</span>
                    </div>
                    <span className="text-2xl font-bold text-primary-600">+{newSalonsThisWeek}</span>
                  </div>
                </div>
              </div>

              {/* Les 5 dernières demandes */}
              <div className="card p-6">
                <h3 className="font-bold text-lg text-neutral-900 mb-4 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-neutral-500" /> Les 5 dernières inscriptions
                </h3>
                <div className="space-y-3">
                  {recentSalonsList.length === 0 ? (
                    <p className="text-neutral-500 text-sm">Aucune inscription récente.</p>
                  ) : (
                    recentSalonsList.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-neutral-100 hover:bg-neutral-50">
                        <div>
                          <p className="font-medium text-sm text-neutral-900">{s.name}</p>
                          <p className="text-xs text-neutral-500">{new Date(s.created_at).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <div>
                          {s.status === 'pending' && <span className="badge bg-amber-100 text-amber-700 text-[10px]">En attente</span>}
                          {s.status === 'approved' && <span className="badge bg-green-100 text-green-700 text-[10px]">Approuvé</span>}
                          {s.status === 'rejected' && <span className="badge bg-red-100 text-red-700 text-[10px]">Refusé</span>}
                          {s.status === 'suspended' && <span className="badge bg-orange-100 text-orange-700 text-[10px]">Suspendu</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB : PENDING REQUESTS */}
        {/* ========================================================= */}
        {tab === 'pending' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-neutral-900">Demandes d'inscription</h2>
              <span className="text-sm text-neutral-500">Triées de la plus ancienne à la plus récente</span>
            </div>
            
            {pendingSalonsList.length === 0 ? (
              <div className="card p-12 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-900">Toutes les demandes ont été traitées</h3>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingSalonsList.map(salon => (
                  <div key={salon.id} className="card overflow-hidden border-amber-200">
                    <div className="p-6 md:p-8">
                      <div className="flex flex-col xl:flex-row gap-6">
                        
                        {/* Infos */}
                        <div className="flex-1 space-y-5">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-xl font-bold text-neutral-900">{salon.name}</h3>
                              <span className="badge bg-amber-100 text-amber-700 border border-amber-200">Nouveau dossier</span>
                            </div>
                            <p className="text-neutral-500 text-sm">Soumis le {new Date(salon.created_at).toLocaleString('fr-FR')}</p>
                          </div>

                          {salon.correction_request && (
                            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm text-amber-800 flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <div>
                                <strong>Corrections demandées :</strong> {salon.correction_request}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                            <div>
                              <p className="text-neutral-400 text-xs uppercase font-bold mb-1">Responsable</p>
                              <p className="font-medium text-neutral-900">{salon.manager_name || '—'}</p>
                            </div>
                            <div>
                              <p className="text-neutral-400 text-xs uppercase font-bold mb-1">Localisation</p>
                              <p className="font-medium text-neutral-900 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-neutral-400" /> 
                                {salon.address}<br/>
                                {salon.city} {salon.district ? `- ${salon.district}` : ''}
                              </p>
                            </div>
                            <div>
                              <p className="text-neutral-400 text-xs uppercase font-bold mb-1">Contact</p>
                              <p className="font-medium text-neutral-900 flex flex-col gap-0.5">
                                <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-neutral-400" /> {salon.phone || '—'}</span>
                                {salon.whatsapp && <span className="text-green-600 flex items-center gap-1.5 ml-5">WhatsApp: {salon.whatsapp}</span>}
                              </p>
                            </div>
                            <div>
                              <p className="text-neutral-400 text-xs uppercase font-bold mb-1">Catégories</p>
                              <div className="flex flex-wrap gap-1">
                                {salon.categories?.map((cat, i) => (
                                  <span key={i} className="bg-white border border-neutral-200 text-neutral-700 px-2 py-0.5 rounded-full text-xs">
                                    {cat}
                                  </span>
                                )) || <span className="text-neutral-500">Aucune</span>}
                              </div>
                            </div>
                          </div>

                          {salon.description && (
                            <div>
                              <p className="text-neutral-400 text-xs uppercase font-bold mb-1">Description</p>
                              <p className="text-sm text-neutral-700 bg-white border border-neutral-100 p-3 rounded-lg leading-relaxed">{salon.description}</p>
                            </div>
                          )}
                          
                          {salon.opening_hours && (
                            <div>
                              <p className="text-neutral-400 text-xs uppercase font-bold mb-1">Horaires</p>
                              <p className="text-sm text-neutral-700 bg-white border border-neutral-100 p-3 rounded-lg whitespace-pre-wrap">{salon.opening_hours}</p>
                            </div>
                          )}

                          {salon.proof_url && (
                            <div>
                              <p className="text-neutral-400 text-xs uppercase font-bold mb-1">Réseaux Sociaux / Lien</p>
                              <a href={salon.proof_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 text-sm hover:underline font-medium">
                                {salon.proof_url}
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Photos */}
                        <div className="xl:w-80 flex-shrink-0">
                          <p className="text-neutral-400 text-xs uppercase font-bold mb-2 flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4" /> Photos du salon
                          </p>
                          {salon.photos && salon.photos.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                              {salon.photos.map((photo, i) => (
                                <a key={i} href={photo} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-lg overflow-hidden border border-neutral-200 hover:opacity-90 transition shadow-sm">
                                  <img src={photo} alt="Salon" className="w-full h-full object-cover" />
                                </a>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-neutral-50 rounded-xl aspect-video flex items-center justify-center text-neutral-400 text-sm border border-neutral-200 border-dashed">
                              Aucune photo
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="bg-neutral-50 border-t border-neutral-200 p-4 md:px-8 flex flex-wrap gap-3 justify-end items-center">
                      <button 
                        onClick={() => { setSelectedSalon(salon); setModalType('reject') }}
                        className="btn-ghost text-red-600 hover:text-red-700 hover:bg-red-50 text-sm"
                      >
                        <XCircle className="w-4 h-4" /> Refuser
                      </button>
                      <button 
                        onClick={() => { setSelectedSalon(salon); setModalType('correction') }}
                        className="btn-secondary text-amber-600 hover:text-amber-700 border-amber-200 hover:border-amber-300 text-sm"
                      >
                        <MessageSquare className="w-4 h-4" /> Demander corrections
                      </button>
                      <button 
                        onClick={() => directAction(salon.id, 'approve')}
                        className="btn-primary bg-green-600 hover:bg-green-700 shadow-green-600/20 text-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Accepter le salon
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB : TOUS LES SALONS */}
        {/* ========================================================= */}
        {tab === 'salons' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-neutral-900">Gestion de tous les salons</h2>
            
            {/* Filtres et recherche */}
            <div className="card p-4 flex flex-col md:flex-row gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Recherche (nom, ville)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-10"
                />
              </div>
              <div className="relative w-full md:w-48">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input pl-10 appearance-none bg-white"
                >
                  <option value="all">Tous statuts</option>
                  <option value="approved">Approuvés</option>
                  <option value="pending">En attente</option>
                  <option value="suspended">Suspendus</option>
                  <option value="rejected">Refusés</option>
                </select>
              </div>
              <div className="relative w-full md:w-48">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="input pl-10 appearance-none bg-white"
                >
                  <option value="all">Toutes les villes</option>
                  {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="relative w-full md:w-48">
                <Scissors className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="input pl-10 appearance-none bg-white"
                >
                  <option value="all">Toutes les catégories</option>
                  {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Liste */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-neutral-50 text-neutral-500 border-b border-neutral-200">
                    <tr>
                      <th className="px-4 py-4 font-medium">Salon</th>
                      <th className="px-4 py-4 font-medium">Localisation & Contact</th>
                      <th className="px-4 py-4 font-medium">Statut & Badge</th>
                      <th className="px-4 py-4 font-medium">Photos</th>
                      <th className="px-4 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredSalons.map(salon => (
                      <tr key={salon.id} className="hover:bg-neutral-50/50">
                        {/* Salon Name */}
                        <td className="px-4 py-4 align-top">
                          <div className="font-bold text-neutral-900 text-base">{salon.name}</div>
                          <div className="text-xs text-neutral-500 mt-1">Resp: {salon.manager_name || '—'}</div>
                          <div className="text-xs text-neutral-400 mt-1">Inscrit: {new Date(salon.created_at).toLocaleDateString('fr-FR')}</div>
                        </td>
                        
                        {/* Location */}
                        <td className="px-4 py-4 align-top">
                          <div className="text-neutral-700 font-medium">{salon.city} {salon.district ? `(${salon.district})` : ''}</div>
                          <div className="text-xs text-neutral-500 mt-1">{salon.phone}</div>
                          {salon.whatsapp && <div className="text-xs text-green-600 mt-0.5">WA: {salon.whatsapp}</div>}
                        </td>
                        
                        {/* Status & Badge */}
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-col gap-2 items-start">
                            {salon.status === 'approved' && <span className="badge bg-green-100 text-green-700">Approuvé</span>}
                            {salon.status === 'pending' && <span className="badge bg-amber-100 text-amber-700">En attente</span>}
                            {salon.status === 'suspended' && <span className="badge bg-orange-100 text-orange-700" title={salon.suspension_reason || ''}>Suspendu</span>}
                            {salon.status === 'rejected' && <span className="badge bg-red-100 text-red-700">Refusé</span>}
                            
                            <button 
                              onClick={() => directAction(salon.id, 'toggle_feature', salon.is_featured)}
                              className={`badge cursor-pointer transition ${salon.is_featured ? 'bg-primary-100 text-primary-700 border border-primary-200' : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'}`}
                              title="Activez pour remonter ce salon en haut de la liste client."
                            >
                              <Star className={`w-3 h-3 ${salon.is_featured ? 'fill-primary-500' : ''}`} /> Recommandé
                            </button>
                          </div>
                        </td>

                        {/* Photos */}
                        <td className="px-4 py-4 align-top">
                          {salon.photos && salon.photos.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {salon.photos.map((p, i) => (
                                <div key={i} className="relative group w-10 h-10 rounded overflow-hidden border border-neutral-200">
                                  <img src={p} className="w-full h-full object-cover" alt="" />
                                  <button 
                                    onClick={() => removePhoto(salon.id, salon.photos!, p)}
                                    className="absolute inset-0 bg-red-500/80 hidden group-hover:flex items-center justify-center text-white"
                                    title="Supprimer la photo"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-400">Aucune</span>
                          )}
                        </td>
                        
                        {/* Actions */}
                        <td className="px-4 py-4 align-top text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button 
                              onClick={() => { setSelectedSalon(salon); setEditForm(salon); setModalType('edit') }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Modifier infos rapides"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            
                            {salon.status === 'approved' && (
                              <button 
                                onClick={() => { setSelectedSalon(salon); setModalType('suspend') }}
                                className="p-1.5 text-orange-600 hover:bg-orange-50 rounded" title="Suspendre"
                              >
                                <AlertCircle className="w-4 h-4" />
                              </button>
                            )}
                            
                            {salon.status === 'suspended' && (
                              <button 
                                onClick={() => directAction(salon.id, 'reactivate')}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Réactiver"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}

                            <button 
                              onClick={() => { setSelectedSalon(salon); setModalType('delete') }}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Supprimer définitivement"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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

      {/* ========================================================= */}
      {/* MODALS UNIFIÉS */}
      {/* ========================================================= */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="card w-full max-w-md p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
            
            {/* Modal: REFUS */}
            {modalType === 'reject' && (
              <>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">Motif du refus</h3>
                <p className="text-neutral-500 text-sm mb-4">Ce motif sera affiché au salon.</p>
                <textarea className="input min-h-[100px] mb-6" value={actionMessage} onChange={e => setActionMessage(e.target.value)} autoFocus />
                <div className="flex gap-3 justify-end">
                  <button onClick={closeModal} className="btn-ghost">Annuler</button>
                  <button onClick={handleAction} className="btn-primary bg-red-600 hover:bg-red-700 border-none">Confirmer le refus</button>
                </div>
              </>
            )}

            {/* Modal: CORRECTION */}
            {modalType === 'correction' && (
              <>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">Demander des corrections</h3>
                <p className="text-neutral-500 text-sm mb-4">Le salon restera "En attente" mais verra ce message.</p>
                <textarea className="input min-h-[100px] mb-6" placeholder="Ex: Veuillez ajouter de meilleures photos..." value={actionMessage} onChange={e => setActionMessage(e.target.value)} autoFocus />
                <div className="flex gap-3 justify-end">
                  <button onClick={closeModal} className="btn-ghost">Annuler</button>
                  <button onClick={handleAction} className="btn-primary bg-amber-600 hover:bg-amber-700 border-none">Envoyer la demande</button>
                </div>
              </>
            )}

            {/* Modal: SUSPENSION */}
            {modalType === 'suspend' && (
              <>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">Suspendre le salon</h3>
                <p className="text-neutral-500 text-sm mb-4">Le salon n'apparaîtra plus publiquement.</p>
                <textarea className="input min-h-[100px] mb-6" placeholder="Motif de suspension obligatoire..." value={actionMessage} onChange={e => setActionMessage(e.target.value)} autoFocus />
                <div className="flex gap-3 justify-end">
                  <button onClick={closeModal} className="btn-ghost">Annuler</button>
                  <button onClick={handleAction} className="btn-primary bg-orange-600 hover:bg-orange-700 border-none">Suspendre</button>
                </div>
              </>
            )}

            {/* Modal: DELETE */}
            {modalType === 'delete' && (
              <>
                <h3 className="text-xl font-bold text-red-600 mb-2">Suppression définitive</h3>
                <p className="text-neutral-600 text-sm mb-4">
                  Cette action est <strong>irréversible</strong>. Pour confirmer, tapez le nom du salon :<br/>
                  <span className="font-bold text-neutral-900 select-none bg-neutral-100 px-2 py-0.5 rounded">{selectedSalon?.name}</span>
                </p>
                <input type="text" className="input mb-6" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder="Nom du salon" autoFocus />
                <div className="flex gap-3 justify-end">
                  <button onClick={closeModal} className="btn-ghost">Annuler</button>
                  <button onClick={handleAction} className="btn-primary bg-red-600 hover:bg-red-700 border-none" disabled={deleteConfirmText !== selectedSalon?.name}>Supprimer définitivement</button>
                </div>
              </>
            )}

            {/* Modal: EDIT INFO */}
            {modalType === 'edit' && (
              <>
                <h3 className="text-xl font-bold text-neutral-900 mb-4">Modifier les informations</h3>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="label">Nom du salon</label>
                    <input className="input" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">Ville</label>
                    <input className="input" value={editForm.city || ''} onChange={e => setEditForm({...editForm, city: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">Téléphone</label>
                    <input className="input" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">WhatsApp</label>
                    <input className="input" value={editForm.whatsapp || ''} onChange={e => setEditForm({...editForm, whatsapp: e.target.value})} />
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button onClick={closeModal} className="btn-ghost">Annuler</button>
                  <button onClick={handleAction} className="btn-primary">Enregistrer</button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  )
}
