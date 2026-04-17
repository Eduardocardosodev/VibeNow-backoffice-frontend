import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  CalendarDays,
  LayoutDashboard,
  Megaphone,
  MessageSquareText,
  Settings,
  ShoppingBag,
  UtensilsCrossed,
  Users,
} from 'lucide-react'

export interface PortalNavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const PORTAL_NAV_ITEMS: PortalNavItem[] = [
  { to: '/', label: 'Painel', icon: LayoutDashboard },
  { to: '/feedbacks', label: 'Feedbacks', icon: MessageSquareText },
  { to: '/citacoes', label: 'Citações', icon: Megaphone },
  { to: '/pedidos', label: 'Pedidos', icon: ShoppingBag },
  { to: '/cardapio', label: 'Cardápio', icon: UtensilsCrossed },
  { to: '/eventos', label: 'Eventos', icon: CalendarDays },
  { to: '/estabelecimento', label: 'Estabelecimento', icon: Building2 },
  { to: '/equipa', label: 'Equipa', icon: Users },
  { to: '/definicoes', label: 'Definições', icon: Settings },
]
