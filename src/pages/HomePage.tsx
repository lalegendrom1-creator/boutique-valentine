import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, MapPin, Scissors, Star, Clock, Sparkles, ArrowRight, Navigation, Heart, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Salon } from '@/types'

export default function HomePage() {
  const navigate = useNavigate()
  const [service, setService] = useState('')
  const [location, setLocation] = useState('')
  const [salons, setSalons] = useState<Salon[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSalons() {
      const { data } = await supabase
        .from('salons')
        .select('*, reviews(rating)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(8)
      setSalons(data || [])
      setLoading(false)
    }
    fetchSalons()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (service) params.set('q', service)
    if (location) params.set('location', location)
    navigate(`/search?${params.toString()}`)
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      const params = new URLSearchParams()
      params.set('lat', pos.coords.latitude.toString())
      params.set('lng', pos.coords.longitude.toString())
      navigate(`/search?${params.toString()}`)
    })
  }

  const categories = [
    { icon: Scissors, label: 'Coiffure', color: 'bg-primary-100 text-primary-700' },
    { icon: Sparkles, label: 'Esthétique', color: 'bg-accent-100 text-accent-700' },
    { icon: Heart, label: 'Soins', color: 'bg-rose-100 text-rose-700' },
    { icon: Star, label: 'Maquillage', color: 'bg-violet-100 text-violet-700' },
  ]

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-accent-50">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary-100/40 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-accent-100/40 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-primary-200 px-4 py-1.5 text-sm font-medium text-primary-700 mb-6 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              La beauté à portée de main
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-900 leading-tight animate-slide-up">
              Trouvez le salon de beauté
              <span className="text-primary-600"> idéal près de chez vous</span>
            </h1>
            <p className="mt-6 text-lg text-neutral-600 leading-relaxed animate-slide-up">
              Réservez votre prochain rendez-vous dans les meilleurs salons de votre ville.
              Coiffure, manucure, esthétique — tout est à portée de clic.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mt-10 max-w-2xl mx-auto">
              <div className="card p-2 flex flex-col sm:flex-row gap-2 shadow-xl shadow-primary-600/5">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    placeholder="Service ou nom de salon"
                    className="w-full pl-12 pr-4 py-3 bg-transparent border-0 focus:ring-0 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none"
                  />
                </div>
                <div className="relative flex-1">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ville ou quartier"
                    className="w-full pl-12 pr-4 py-3 bg-transparent border-0 focus:ring-0 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none"
                  />
                </div>
                <button type="submit" className="btn-primary px-8">
                  <Search className="w-4 h-4" />
                  Rechercher
                </button>
              </div>
              <button
                type="button"
                onClick={useMyLocation}
                className="mt-3 inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                <Navigation className="w-4 h-4" />
                Utiliser ma position actuelle
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Catégories de services</h2>
        <p className="text-neutral-500 mb-8">Explorez par type de prestation</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.label}
              to={`/search?q=${cat.label}`}
              className="card card-hover p-6 flex flex-col items-center gap-3 text-center group"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${cat.color} group-hover:scale-110 transition-transform`}>
                <cat.icon className="w-7 h-7" />
              </div>
              <span className="font-semibold text-neutral-800">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Salons à proximité / Popular */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-1">Salons populaires</h2>
            <p className="text-neutral-500">Les mieux notés près de vous</p>
          </div>
          <Link to="/search" className="hidden sm:flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
            Voir tout <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-80" />
            ))}
          </div>
        ) : salons.length === 0 ? (
          <div className="card p-12 text-center">
            <Scissors className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500">Aucun salon n'a encore été inscrit. Revenez bientôt !</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {salons.map((salon) => (
              <SalonCard key={salon.id} salon={salon} />
            ))}
          </div>
        )}
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-neutral-900 mb-2">Comment ça marche</h2>
            <p className="text-neutral-500">Réservez en 3 étapes simples</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Search, title: 'Recherchez', desc: 'Trouvez le salon idéal par service, ville ou proximité.' },
              { icon: Calendar, title: 'Réservez', desc: 'Choisissez un créneau disponible et confirmez votre rendez-vous.' },
              { icon: Star, title: 'Profitez', desc: 'Visitez le salon et partagez votre expérience avec un avis.' },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-8 h-8 text-primary-700" />
                </div>
                <div className="text-sm font-semibold text-primary-600 mb-1">Étape {i + 1}</div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">{step.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA for salon owners */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-600 to-primary-800 p-8 sm:p-12">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-2">
                Vous êtes propriétaire d'un salon ?
              </h2>
              <p className="text-primary-100 text-lg">
                Inscrivez votre salon et atteignez des milliers de clients près de chez vous.
              </p>
            </div>
            <Link to="/register-salon" className="btn-secondary whitespace-nowrap text-primary-700 border-white bg-white hover:bg-primary-50">
              Inscrire mon salon
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function SalonCard({ salon }: { salon: Salon & { reviews?: { rating: number }[] } }) {
  const reviews = salon.reviews || []
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null

  return (
    <Link to={`/salon/${salon.id}`} className="card card-hover overflow-hidden group">
      <div className="aspect-[4/3] bg-gradient-to-br from-primary-100 to-accent-100 relative overflow-hidden">
        {salon.logo ? (
          <img src={salon.logo} alt={salon.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Scissors className="w-12 h-12 text-primary-300" />
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-neutral-900 truncate">{salon.name}</h3>
          {avgRating && (
            <div className="flex items-center gap-1 text-sm flex-shrink-0">
              <Star className="w-4 h-4 fill-accent-400 text-accent-400" />
              <span className="font-medium">{avgRating}</span>
            </div>
          )}
        </div>
        <p className="text-sm text-neutral-500 truncate mb-2">
          {salon.city ? `${salon.city}` : ''}
          {salon.neighborhood ? `, ${salon.neighborhood}` : ''}
        </p>
        <div className="flex items-center gap-1 text-xs text-neutral-400">
          <Clock className="w-3.5 h-3.5" />
          <span>{salon.phone || 'Voir les détails'}</span>
        </div>
      </div>
    </Link>
  )
}
