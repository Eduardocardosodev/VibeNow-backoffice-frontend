import { Outlet } from 'react-router-dom'
import { AppSidebar } from '@/components/layout/AppSidebar'
import '@/styles/sidebar.css'

export function AppLayout() {
  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="app-shell__main">
        <Outlet />
      </div>
    </div>
  )
}
