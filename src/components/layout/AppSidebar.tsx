import { useCallback, useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Store } from 'lucide-react'
import { PORTAL_NAV_ITEMS } from '@/configs/navItems'

const STORAGE_KEY = 'vibenow_sidebar_collapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(readCollapsed)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  const toggle = useCallback(() => {
    setCollapsed((c) => !c)
  }, [])

  return (
    <aside
      className={`app-sidebar${collapsed ? ' app-sidebar--collapsed' : ''}`}
      aria-label="Navegação do portal"
    >
      <div className="app-sidebar__header">
        <div className="app-sidebar__brand">
          <span className="app-sidebar__brand-icon" aria-hidden>
            <Store size={22} strokeWidth={2} />
          </span>
          <span className="app-sidebar__brand-text">VibeNow</span>
        </div>
      </div>

      <nav className="app-sidebar__nav">
        {PORTAL_NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `app-sidebar__link${isActive ? ' app-sidebar__link--active' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <span className="app-sidebar__icon" aria-hidden>
                <Icon size={20} strokeWidth={2} />
              </span>
              <span className="app-sidebar__label">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="app-sidebar__footer">
        <button
          type="button"
          className="app-sidebar__toggle"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? (
            <ChevronRight size={20} strokeWidth={2} />
          ) : (
            <ChevronLeft size={20} strokeWidth={2} />
          )}
          {!collapsed && <span className="app-sidebar__toggle-label">Recolher</span>}
        </button>
      </div>
    </aside>
  )
}
