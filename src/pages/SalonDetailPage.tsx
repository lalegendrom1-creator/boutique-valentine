import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Star, MapPin, Phone, MessageCircle, Clock, Scissors, ChevronLeft, Heart, Calendar, CheckCircle2 } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Salon, Service, BusinessHour, Staff, Review, SalonImage } from '@/types'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

export default function SalonDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session, profile } = useAuth()
  const [salon, setSalon] = useState<Salon | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [hours, setHours] = useState<BusinessHour[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [reviews, setReviews] = useState<(Review & { profiles?: { name: string; avatar: string | null } })[]>([])
  const [images, setImages] = useState<SalonImage[]>([])
  const [loading, setLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [activeImage, setActiveImage] = useState(0)

  useEffect(() => {
    if (!id) return
    async function fetchAll() {
      const [salonRes, servicesRes, hoursRes, staffRes, reviewsRes, imagesRes] = await Promise.all([
        supabase.from('salons').select('*').eq('id', id).maybeSingle(),
        supabase.from('services').select('*').eq('salon_id', id).order('price', { ascending: true }),
        supabase.from('business_hours').select('*').eq('salon_id', id).order('day', { ascending: true }),
        supabase.from('staff').select('*').eq('salon_id', id),
        supabase.from('reviews').select('*, profiles!reviews_user_id_fkey(name, avatar)').eq('salon_id', id).order('created_at', { ascending: false }),
        supabase.from('salon_images').select('*').eq('salon_id', id).order('created_at', { ascending: true }),
      ])

      setSalon(salonRes.data as Salon | null)
      setServices(servicesRes.data as Service[] || [])
      setHours(hoursRes.data as BusinessHour[] || [])
      setStaff(staffRes.data as Staff[] || [])
      setReviews(reviewsRes.data as any || [])
      setImages(imagesRes.data as SalonImage[] || [])
      setLoading(false)
    }
    fetchAll()
  }, [id])

  useEffect(() => {
    if (session?.user && id) {
      supabase
        .from('favorites')
        .select('id')
        .eq('salon_id', id)
        .eq('user_id', session.user.id)
        .maybeSingle()
        .then(({ data }) => setIsFavorite(!!data))
    }
  }, [session, id])

  const toggleFavorite = async () => {
    if (!session?.user || !id) return
    if (isFavorite) {
      await supabase.from('favorites').delete().eq('salon_id', id).eq('user_id', session.user.id)
      setIsFavorite(false)
    } else {
      await supabase.from('favorites').insert({ salon_id: id, user_id: session.user.id })
      setIsFavorite(true)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!salon) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-neutral-500">Salon introuvable.</p>
        <Link to="/search" className="btn-primary">Retour à la recherche</Link>
      </div>
    )
  }

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
  const ratingDist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
  }))

  const today = new Date().getDay()
  const todayHours = hours.find(h => h.day === today)
  const isOpen = todayHours && !todayHours.is_closed && todayHours.opening_time && todayHours.closing_time

  const galleryImages = images.length > 0 ? images.map(i => i.image_url) : (salon.logo ? [salon.logo] : [])

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Back button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900">
          <ChevronLeft className="w-4 h-4" /> Retour
        </button>
      </div>

      {/* Gallery */}
      {galleryImages.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="aspect-[21/9] sm:aspect-[21/8] rounded-2xl overflow-hidden bg-neutral-200 relative">
            <img src={galleryImages[activeImage]} alt={salon.name} className="w-full h-full object-cover" />
            {galleryImages.length > 1 && (
              <div className="absolute bottom-4 left-4 flex gap-2">
                {galleryImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                      activeImage === i ? 'border-white scale-110' : 'border-white/50 opacity-70'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="font-display text-3xl font-bold text-neutral-900">{salon.name}</h1>
                  <div className="flex items-center gap-4 mt-2">
                    {avgRating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="w-5 h-5 fill-accent-400 text-accent-400" />
                        <span className="font-semibold">{avgRating.toFixed(1)}</span>
                        <span className="text-neutral-400">({reviews.length} avis)</span>
                      </div>
                    )}
                    <span className={`badge ${isOpen ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
                      {isOpen ? 'Ouvert' : 'Fermé'}
                    </span>
                  </div>
                </div>
                {session && profile?.role === 'client' && (
                  <button
                    onClick={toggleFavorite}
                    className={`p-3 rounded-full border transition-all ${
                      isFavorite ? 'bg-primary-50 border-primary-200 text-primary-600' : 'border-neutral-200 text-neutral-400 hover:text-primary-500'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isFavorite ? 'fill-primary-500' : ''}`} />
                  </button>
                )}
              </div>

              {salon.description && (
                <p className="mt-4 text-neutral-600 leading-relaxed">{salon.description}</p>
              )}
            </div>

            {/* Services */}
            <div>
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Services & Tarifs</h2>
              {services.length === 0 ? (
                <p className="text-neutral-500 text-sm">Aucun service publié pour le moment.</p>
              ) : (
                <div className="space-y-3">
                  {services.map((service) => (
                    <div key={service.id} className="card p-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-neutral-900">{service.name}</h3>
                        {service.description && <p className="text-sm text-neutral-500 mt-1">{service.description}</p>}
                        <div className="flex items-center gap-3 mt-2 text-sm text-neutral-400">
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {service.duration} min</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary-700">{service.price} FCFA</div>
                        {session && profile?.role === 'client' && (
                          <Link
                            to={`/book/${salon.id}?service=${service.id}`}
                            className="text-sm text-primary-600 hover:underline mt-1 inline-block"
                          >
                            Réserver
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Staff */}
            {staff.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-neutral-900 mb-4">Notre équipe</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {staff.map((member) => (
                    <div key={member.id} className="card p-4 text-center">
                      <div className="w-16 h-16 rounded-full bg-primary-100 mx-auto mb-3 overflow-hidden">
                        {member.photo ? (
                          <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-primary-500 font-semibold text-lg">
                            {member.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <h3 className="font-medium text-neutral-900 text-sm">{member.name}</h3>
                      {member.specialty && <p className="text-xs text-neutral-500 mt-1">{member.specialty}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div>
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Avis clients</h2>
              {reviews.length === 0 ? (
                <p className="text-neutral-500 text-sm">Aucun avis pour le moment.</p>
              ) : (
                <>
                  {/* Rating summary */}
                  <div className="card p-6 mb-4 flex flex-col sm:flex-row gap-6 items-center">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-neutral-900">{avgRating.toFixed(1)}</div>
                      <div className="flex items-center gap-0.5 mt-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-4 h-4 ${s <= Math.round(avgRating) ? 'fill-accent-400 text-accent-400' : 'text-neutral-200'}`} />
                        ))}
                      </div>
                      <p className="text-sm text-neutral-400 mt-1">{reviews.length} avis</p>
                    </div>
                    <div className="flex-1 w-full space-y-1">
                      {ratingDist.map(d => (
                        <div key={d.star} className="flex items-center gap-2 text-sm">
                          <span className="w-3 text-neutral-500">{d.star}</span>
                          <Star className="w-3 h-3 fill-accent-400 text-accent-400" />
                          <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                            <div className="h-full bg-accent-400 rounded-full" style={{ width: `${(d.count / reviews.length) * 100}%` }} />
                          </div>
                          <span className="text-neutral-400 w-6 text-right">{d.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Review list */}
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="card p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
                            {review.profiles?.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-neutral-900">{review.profiles?.name || 'Anonyme'}</p>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map(s => (
                                <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'fill-accent-400 text-accent-400' : 'text-neutral-200'}`} />
                              ))}
                              <span className="text-xs text-neutral-400 ml-1">
                                {new Date(review.created_at).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                          </div>
                        </div>
                        {review.comment && <p className="text-sm text-neutral-600 mt-2">{review.comment}</p>}
                        {review.owner_response && (
                          <div className="mt-3 ml-4 pl-4 border-l-2 border-primary-100">
                            <p className="text-xs font-medium text-primary-700 mb-1">Réponse du salon</p>
                            <p className="text-sm text-neutral-600">{review.owner_response}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact & Info */}
            <div className="card p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-neutral-900 mb-3">Informations</h3>
                <div className="space-y-3 text-sm">
                  {salon.address && (
                    <div className="flex items-start gap-2 text-neutral-600">
                      <MapPin className="w-4 h-4 text-primary-500 mt-0.5" />
                      <span>{salon.address}{salon.neighborhood ? `, ${salon.neighborhood}` : ''}{salon.city ? `, ${salon.city}` : ''}</span>
                    </div>
                  )}
                  {salon.phone && (
                    <a href={`tel:${salon.phone}`} className="flex items-center gap-2 text-neutral-600 hover:text-primary-600">
                      <Phone className="w-4 h-4 text-primary-500" /> {salon.phone}
                    </a>
                  )}
                  {salon.whatsapp && (
                    <a href={`https://wa.me/${salon.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-neutral-600 hover:text-green-600">
                      <MessageCircle className="w-4 h-4 text-green-500" /> WhatsApp
                    </a>
                  )}
                </div>
              </div>

              {/* Hours */}
              <div>
                <h4 className="font-medium text-neutral-900 mb-2 text-sm">Horaires d'ouverture</h4>
                <div className="space-y-1 text-sm">
                  {hours.length === 0 ? (
                    <p className="text-neutral-400">Horaires non renseignés</p>
                  ) : (
                    DAY_NAMES.map((day, i) => {
                      const h = hours.find(h => h.day === i)
                      return (
                        <div key={i} className={`flex justify-between ${i === today ? 'font-medium text-primary-700' : 'text-neutral-600'}`}>
                          <span>{day}</span>
                          <span>{h?.is_closed || !h?.opening_time ? 'Fermé' : `${h.opening_time.slice(0, 5)} - ${h.closing_time!.slice(0, 5)}`}</span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Map */}
            {salon.latitude && salon.longitude && (
              <div className="card overflow-hidden">
                <div className="p-4 pb-2">
                  <h3 className="font-semibold text-neutral-900 text-sm">Localisation</h3>
                </div>
                <div style={{ height: '240px' }}>
                  <MapContainer center={[salon.latitude, salon.longitude]} zoom={15} className="w-full h-full">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                    <Marker position={[salon.latitude, salon.longitude]}>
                      <Popup>{salon.name}</Popup>
                    </Marker>
                  </MapContainer>
                </div>
              </div>
            )}

            {/* Book button */}
            {session && profile?.role === 'client' && services.length > 0 && (
              <Link to={`/book/${salon.id}`} className="btn-primary w-full">
                <Calendar className="w-4 h-4" /> Prendre rendez-vous
              </Link>
            )}
            {!session && services.length > 0 && (
              <Link to="/login" className="btn-primary w-full">
                <Calendar className="w-4 h-4" /> Connectez-vous pour réserver
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
