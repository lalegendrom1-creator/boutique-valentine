import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, MapPin, Star, Navigation, Scissors, List, Map as MapIcon, Filter } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '@/lib/supabase'
import type { Salon } from '@/types'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

export default function SearchPage() {
  const [params] = useSearchParams()
  const [salons, setSalons] = useState<Salon[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'map'>('list')
  const [searchQuery, setSearchQuery] = useState(params.get('q') || '')
  const [searchLocation, setSearchLocation] = useState(params.get('location') || '')
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    const lat = params.get('lat')
    const lng = params.get('lng')
    if (lat && lng) {
      setUserPos({ lat: parseFloat(lat), lng: parseFloat(lng) })
    }
  }, [params])

  useEffect(() => {
    async function fetchSalons() {
      setLoading(true)
      let query = supabase
        .from('salons')
        .select('*, reviews(rating), services(name, price)')
        .eq('status', 'approved')

      const q = params.get('q')
      const loc = params.get('location')

      if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`)
      if (loc) query = query.or(`city.ilike.%${loc}%,neighborhood.ilike.%${loc}%`)

      const { data } = await query.order('created_at', { ascending: false })
      setSalons(data || [])
      setLoading(false)
    }
    fetchSalons()
  }, [params])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const newParams = new URLSearchParams()
    if (searchQuery) newParams.set('q', searchQuery)
    if (searchLocation) newParams.set('location', searchLocation)
    window.location.search = newParams.toString()
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      const newParams = new URLSearchParams(params)
      newParams.set('lat', pos.coords.latitude.toString())
      newParams.set('lng', pos.coords.longitude.toString())
      window.location.search = newParams.toString()
    })
  }

  const center = userPos || (salons[0]?.latitude && salons[0]?.longitude
    ? { lat: salons[0].latitude, lng: salons[0].longitude }
    : { lat: 6.1725, lng: 1.2314 })

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Search bar */}
      <div className="bg-white border-b border-neutral-200 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Service ou nom de salon"
                className="input pl-10"
              />
            </div>
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                placeholder="Ville ou quartier"
                className="input pl-10"
              />
            </div>
            <button type="submit" className="btn-primary">Rechercher</button>
            <button type="button" onClick={useMyLocation} className="btn-secondary">
              <Navigation className="w-4 h-4" /> Ma position
            </button>
          </form>

          <div className="flex items-center justify-between mt-3">
            <p className="text-sm text-neutral-500">
              {loading ? 'Recherche…' : `${salons.length} salon${salons.length > 1 ? 's' : ''} trouvé${salons.length > 1 ? 's' : ''}`}
            </p>
            <div className="flex items-center gap-1 rounded-full bg-neutral-100 p-1">
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  view === 'list' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
                }`}
              >
                <List className="w-4 h-4" /> Liste
              </button>
              <button
                onClick={() => setView('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  view === 'map' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
                }`}
              >
                <MapIcon className="w-4 h-4" /> Carte
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-72" />
            ))}
          </div>
        ) : salons.length === 0 ? (
          <div className="card p-12 text-center">
            <Search className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-neutral-700 mb-1">Aucun salon trouvé</h3>
            <p className="text-neutral-500">Essayez d'élargir votre recherche ou changez de ville.</p>
          </div>
        ) : view === 'list' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {salons.map((salon) => (
              <SalonSearchCard key={salon.id} salon={salon} userPos={userPos} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden border border-neutral-200 shadow-sm" style={{ height: '70vh' }}>
            <MapContainer center={center} zoom={13} className="w-full h-full">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              {userPos && (
                <Marker position={[userPos.lat, userPos.lng]}>
                  <Popup>Vous êtes ici</Popup>
                </Marker>
              )}
              {salons.filter(s => s.latitude && s.longitude).map((salon) => (
                <Marker key={salon.id} position={[salon.latitude!, salon.longitude!]}>
                  <Popup>
                    <div className="p-1">
                      <strong>{salon.name}</strong>
                      <br />
                      {salon.address || salon.city || ''}
                      <br />
                      <a href={`/salon/${salon.id}`} className="text-primary-600 font-medium">Voir le salon</a>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}
      </div>
    </div>
  )
}

function SalonSearchCard({ salon, userPos }: { salon: Salon & { reviews?: { rating: number }[]; services?: { name: string; price: number }[] }, userPos: { lat: number; lng: number } | null }) {
  const reviews = salon.reviews || []
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null

  const distance = userPos && salon.latitude && salon.longitude
    ? calcDistance(userPos.lat, userPos.lng, salon.latitude, salon.longitude)
    : null

  return (
    <Link to={`/salon/${salon.id}`} className="card card-hover overflow-hidden group">
      <div className="aspect-[16/10] bg-gradient-to-br from-primary-100 to-accent-100 relative overflow-hidden">
        {salon.logo ? (
          <img src={salon.logo} alt={salon.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Scissors className="w-12 h-12 text-primary-300" />
          </div>
        )}
        {distance !== null && (
          <div className="absolute top-3 right-3 badge bg-white/90 text-neutral-700">
            <MapPin className="w-3 h-3" /> {distance.toFixed(1)} km
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-neutral-900">{salon.name}</h3>
          {avgRating && (
            <div className="flex items-center gap-1 text-sm flex-shrink-0">
              <Star className="w-4 h-4 fill-accent-400 text-accent-400" />
              <span className="font-medium">{avgRating}</span>
              <span className="text-neutral-400">({reviews.length})</span>
            </div>
          )}
        </div>
        <p className="text-sm text-neutral-500 mb-3">
          {salon.address || ''}
          {salon.address && (salon.city || salon.neighborhood) ? ', ' : ''}
          {salon.neighborhood ? `${salon.neighborhood}, ` : ''}
          {salon.city || ''}
        </p>
        {salon.services && salon.services.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {salon.services.slice(0, 3).map((s, i) => (
              <span key={i} className="badge bg-primary-50 text-primary-700">{s.name}</span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-400">
            {salon.services && salon.services.length > 0
              ? `À partir de ${salon.services[0].price} FCFA`
              : 'Voir les tarifs'}
          </span>
          <span className="text-sm font-medium text-primary-600 group-hover:underline">Voir le salon</span>
        </div>
      </div>
    </Link>
  )
}

function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
