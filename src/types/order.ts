export type OrderStatus = 'PENDING' | 'IN_PROGRESS' | 'READY' | 'DELIVERED' | 'CANCELLED'

export const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'READY',
  'DELIVERED',
  'CANCELLED',
]

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em preparação',
  READY: 'Pronto',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
}

export function orderStatusLabel(s: string): string {
  return ORDER_STATUS_LABEL[s as OrderStatus] ?? s
}

export interface OrderLineItem {
  id: number
  menuItemId: number
  quantity: number
  unitPrice: number
  itemName: string
}

export interface OrderUserBrief {
  id: number
  name: string
  phone: string | null
}

export interface OrderEstablishmentBrief {
  id: number
  name: string
}

export interface EstablishmentOrder {
  id: number
  establishmentId: number
  userId: number
  locationNote: string | null
  status: OrderStatus
  createdAt: string
  updatedAt: string
  items: OrderLineItem[]
  user?: OrderUserBrief | null
  establishment?: OrderEstablishmentBrief | null
}

export interface OrdersListPage {
  items: EstablishmentOrder[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface EstablishmentOrdersQuery {
  status?: OrderStatus
  page?: number
  pageSize?: number
}
