import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts'
import { PageLoading } from '@/components/PageLoading'

export function PublicOnlyRoute() {
  const { user, isReady, clearError } = useAuth()
  const location = useLocation()

  useEffect(() => {
    clearError()
  }, [location.pathname, clearError])

  if (!isReady) {
    return <PageLoading />
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
