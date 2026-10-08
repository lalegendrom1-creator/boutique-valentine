import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import HomePage from '@/pages/HomePage'
import SearchPage from '@/pages/SearchPage'
import SalonDetailPage from '@/pages/SalonDetailPage'
import BookingPage from '@/pages/BookingPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import RegisterSalonPage from '@/pages/RegisterSalonPage'
import AppointmentsPage from '@/pages/AppointmentsPage'
import FavoritesPage from '@/pages/FavoritesPage'
import SalonDashboardPage from '@/pages/SalonDashboardPage'
import AdminDashboardPage from '@/pages/AdminDashboardPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/salon/:id" element={<SalonDetailPage />} />
            <Route path="/register-salon" element={<RegisterSalonPage />} />
            <Route
              path="/book/:id"
              element={
                <ProtectedRoute>
                  <BookingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/appointments"
              element={
                <ProtectedRoute>
                  <AppointmentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/favorites"
              element={
                <ProtectedRoute>
                  <FavoritesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roles={['salon_owner', 'admin']}>
                  <SalonDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<HomePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
