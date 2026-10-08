import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Star, MapPin, Scissors } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Salon } from '@/types'

export default function FavoritesPage() {
  const { session } = useAuth()
  const [salons, setSalons] = useState<Salon[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user) return
    supabase
      .from('favorites')
      .select('salons(*)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setSalons((data as any || []).map((f: any) => f.salons))
        setLoading(false)
      })
  }, [session])

  const removeFavorite = async (salonId: string) => {
    if (!session?.user) return
    await supabase.from('favorites').delete().eq('salon_id', salonId).eq('user_id', session.user.id)
    setSalons(prev => prev.filter(s => s.id !== salonId))
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-display text-2xl font-bold text-neutral-900 mb-6">Mes salons favoris</h1>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-48" />)}
          </div>
        ) : salons.length === 0 ? (
          <div className="card p-12 text-center">
            <Heart className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500 mb-4">Vous n'avez pas encore de favoris.</p>
            <Link to="/search" className="btn-primary">Découvrir des salons</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {salons.map(salon => (
              <div key={salon.id} className="card card-hover overflow-hidden">
                <Link to={`/salon/${salon.id}`} className="block">
                  <div className="aspect-[16/9] bg-gradient-to-br from-primary-100 to-accent-100">
                    {salon.logo ? (
                      <img src={salon.logo} alt={salon.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Scissors className="w-10 h-10 text-primary-300" />
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <Link to={`/salon/${salon.id}`}>
                      <h3 className="font-semibold text-neutral-900">{salon.name}</h3>
                    </Link>
                    <button onClick={() => removeFavorite(salon.id)} className="text-neutral-300 hover:text-red-500">
                      <Heart className="w-5 h-5 fill-red-400 text-red-400" />
                    </button>
                  </div>
                  {salon.city && (
                    <p className="text-sm text-neutral-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5" /> {salon.city}{salon.neighborhood ? `, ${salon.neighborhood}` : ''}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
