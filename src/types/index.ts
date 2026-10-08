export type UserRole = 'client' | 'salon_owner' | 'admin'

export type SalonStatus = 'pending' | 'approved' | 'suspended' | 'rejected'

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'cancelled'
  | 'completed'
  | 'no_show'

export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Profile {
  id: string
  name: string
  email: string
  phone: string | null
  role: UserRole
  avatar: string | null
  created_at: string
  updated_at: string
}

export interface Salon {
  id: string
  owner_id: string
  name: string
  description: string | null
  phone: string | null
  whatsapp: string | null
  address: string | null
  city: string | null
  neighborhood: string | null
  latitude: number | null
  longitude: number | null
  logo: string | null
  status: SalonStatus
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  salon_id: string
  name: string
  description: string | null
  price: number
  duration: number
  created_at: string
  updated_at: string
}

export interface BusinessHour {
  id: string
  salon_id: string
  day: WeekDay
  opening_time: string | null
  closing_time: string | null
  is_closed: boolean
}

export interface Staff {
  id: string
  salon_id: string
  name: string
  specialty: string | null
  phone: string | null
  photo: string | null
}

export interface Appointment {
  id: string
  user_id: string
  salon_id: string
  service_id: string
  staff_id: string | null
  date: string
  start_time: string
  end_time: string
  status: AppointmentStatus
  total_price: number
  created_at: string
}

export interface Review {
  id: string
  user_id: string
  salon_id: string
  appointment_id: string
  rating: number
  comment: string | null
  owner_response: string | null
  created_at: string
}

export interface Favorite {
  id: string
  user_id: string
  salon_id: string
  created_at: string
}

export interface SalonImage {
  id: string
  salon_id: string
  image_url: string
  created_at: string
}

export interface SalonWithRelations extends Salon {
  services?: Service[]
  images?: SalonImage[]
  business_hours?: BusinessHour[]
  staff?: Staff[]
  reviews?: ReviewWithProfile[]
  favorite_count?: number
  average_rating?: number
  review_count?: number
}

export interface ReviewWithProfile extends Review {
  profiles?: Pick<Profile, 'id' | 'name' | 'avatar'>
}
