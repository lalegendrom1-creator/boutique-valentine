import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, CheckCircle2, Clock, Calendar, Scissors } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Service, Staff, BusinessHour } from '@/types'

const TIME_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30']

export default function BookingPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { session } = useAuth()

  const [services, setServices] = useState<Service[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [hours, setHours] = useState<BusinessHour[]>([])
  const [selectedService, setSelectedService] = useState<string>(params.get('service') || '')
  const [selectedStaff, setSelectedStaff] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('services').select('*').eq('salon_id', id).order('price', { ascending: true }),
      supabase.from('staff').select('*').eq('salon_id', id),
      supabase.from('business_hours').select('*').eq('salon_id', id),
    ]).then(([s, st, h]) => {
      setServices(s.data || [])
      setStaff(st.data || [])
      setHours(h.data || [])
    })
  }, [id])

  useEffect(() => {
    if (!id || !selectedDate) return
    supabase
      .from('appointments')
      .select('start_time')
      .eq('salon_id', id)
      .eq('date', selectedDate)
      .in('status', ['pending', 'confirmed'])
      .then(({ data }) => {
        setBookedSlots((data || []).map((a: any) => a.start_time.slice(0, 5)))
      })
  }, [id, selectedDate])

  const service = services.find(s => s.id === selectedService)
  const today = new Date()
  const minDate = today.toISOString().split('T')[0]

  const dayOfWeek = selectedDate ? new Date(selectedDate).getDay() : -1
  const dayHours = hours.find(h => h.day === dayOfWeek)
  const isClosed = !dayHours || dayHours.is_closed || !dayHours.opening_time

  const handleSubmit = async () => {
    if (!session?.user || !id || !service || !selectedDate || !selectedTime) return
    setSubmitting(true)

    const endTime = new Date(`2000-01-01T${selectedTime}`)
    endTime.setMinutes(endTime.getMinutes() + service.duration)
    const endStr = endTime.toTimeString().slice(0, 8)

    const { error } = await supabase.from('appointments').insert({
      user_id: session.user.id,
      salon_id: id,
      service_id: selectedService,
      staff_id: selectedStaff || null,
      date: selectedDate,
      start_time: selectedTime,
      end_time: endStr,
      total_price: service.price,
      status: 'pending',
    })

    setSubmitting(false)
    if (!error) {
      setConfirmed(true)
    } else {
      alert('Erreur lors de la réservation: ' + error.message)
    }
  }

  if (confirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="card p-8 max-w-md text-center animate-scale-in">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Réservation confirmée !</h1>
          <p className="text-neutral-500 mb-6">
            Votre rendez-vous pour <strong>{service?.name}</strong> le{' '}
            <strong>{new Date(selectedDate).toLocaleDateString('fr-FR')}</strong> à{' '}
            <strong>{selectedTime}</strong> a été envoyé au salon.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/appointments')} className="btn-primary">Mes rendez-vous</button>
            <button onClick={() => navigate('/')} className="btn-secondary">Accueil</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 mb-6">
          <ChevronLeft className="w-4 h-4" /> Retour
        </button>

        <h1 className="font-display text-2xl font-bold text-neutral-900 mb-6">Prendre rendez-vous</h1>

        <div className="space-y-6">
          {/* Step 1: Service */}
          <div className="card p-6">
            <h2 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-sm flex items-center justify-center">1</span>
              Choisissez un service
            </h2>
            <div className="space-y-2">
              {services.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedService(s.id)}
                  className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                    selectedService === s.id ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-neutral-900">{s.name}</p>
                      <p className="text-sm text-neutral-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {s.duration} min</p>
                    </div>
                    <span className="font-bold text-primary-700">{s.price} FCFA</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Staff */}
          {staff.length > 0 && selectedService && (
            <div className="card p-6">
              <h2 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-sm flex items-center justify-center">2</span>
                Choisissez un employé (optionnel)
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedStaff('')}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${!selectedStaff ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 hover:border-neutral-300'}`}
                >
                  <p className="text-sm font-medium text-neutral-700">Indifférent</p>
                </button>
                {staff.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedStaff(m.id)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${selectedStaff === m.id ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 hover:border-neutral-300'}`}
                  >
                    <p className="text-sm font-medium text-neutral-700">{m.name}</p>
                    {m.specialty && <p className="text-xs text-neutral-400">{m.specialty}</p>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Date */}
          {selectedService && (
            <div className="card p-6">
              <h2 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-sm flex items-center justify-center">3</span>
                Choisissez une date
              </h2>
              <input
                type="date"
                min={minDate}
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime('') }}
                className="input"
              />
              {selectedDate && isClosed && (
                <p className="mt-2 text-sm text-red-600">Le salon est fermé ce jour-là. Choisissez une autre date.</p>
              )}
            </div>
          )}

          {/* Step 4: Time */}
          {selectedService && selectedDate && !isClosed && (
            <div className="card p-6">
              <h2 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-sm flex items-center justify-center">4</span>
                Choisissez un créneau
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {TIME_SLOTS.map(slot => {
                  const booked = bookedSlots.includes(slot)
                  return (
                    <button
                      key={slot}
                      disabled={booked}
                      onClick={() => setSelectedTime(slot)}
                      className={`p-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                        booked
                          ? 'border-neutral-100 bg-neutral-50 text-neutral-300 cursor-not-allowed line-through'
                          : selectedTime === slot
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-neutral-200 hover:border-primary-300 text-neutral-700'
                      }`}
                    >
                      {slot}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Summary & Confirm */}
          {selectedService && selectedDate && selectedTime && (
            <div className="card p-6 animate-slide-up">
              <h2 className="font-semibold text-neutral-900 mb-4">Récapitulatif</h2>
              <div className="space-y-2 text-sm text-neutral-600 mb-4">
                <div className="flex justify-between"><span>Service</span><span className="font-medium">{service?.name}</span></div>
                <div className="flex justify-between"><span>Date</span><span className="font-medium">{new Date(selectedDate).toLocaleDateString('fr-FR')}</span></div>
                <div className="flex justify-between"><span>Heure</span><span className="font-medium">{selectedTime}</span></div>
                <div className="flex justify-between"><span>Durée</span><span className="font-medium">{service?.duration} min</span></div>
                <div className="flex justify-between text-base pt-2 border-t border-neutral-100"><span className="font-semibold">Total</span><span className="font-bold text-primary-700">{service?.price} FCFA</span></div>
              </div>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full">
                {submitting ? 'Réservation…' : 'Confirmer la réservation'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
