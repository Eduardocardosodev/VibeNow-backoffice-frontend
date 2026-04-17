import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts'
import { PageLoading } from '@/components/PageLoading'

export function ProtectedRoute() {
  const { user, isReady } = useAuth()
  const location = useLocation()

  if (!isReady) {
    return <PageLoading />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
