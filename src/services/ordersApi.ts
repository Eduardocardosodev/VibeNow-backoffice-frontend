import { apiGetJson, apiPatchJson } from '@/lib/apiClient'
import type {
  EstablishmentOrder,
  EstablishmentOrdersQuery,
  OrderLineItem,
  OrderStatus,
  OrdersListPage,
} from '@/types/order'

function normalizeStatus(raw: unknown): OrderStatus {
  const s = String(raw ?? '')
  if (
    s === 'PENDING' ||
    s === 'IN_PROGRESS' ||
    s === 'READY' ||
    s === 'DELIVERED' ||
    s === 'CANCELLED'
  ) {
    return s
  }
  return 'PENDING'
}

function normalizeLineItem(raw: Record<string, unknown>): OrderLineItem {
  return {
    id: Number(raw.id) || 0,
    menuItemId: Number(raw.menuItemId) || 0,
    quantity: Number(raw.quantity) || 0,
    unitPrice: Number(raw.unitPrice) || 0,
    itemName: String(raw.itemName ?? ''),
  }
}

function normalizeUser(raw: unknown): EstablishmentOrder['user'] {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  return {
    id: Number(o.id) || 0,
    name: String(o.name ?? ''),
    phone: o.phone == null ? null : String(o.phone),
  }
}

function normalizeEstablishment(raw: unknown): EstablishmentOrder['establishment'] {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  return {
    id: Number(o.id) || 0,
    name: String(o.name ?? ''),
  }
}

export function normalizeEstablishmentOrder(raw: Record<string, unknown>): EstablishmentOrder {
  const itemsRaw = Array.isArray(raw.items) ? raw.items : []
  return {
    id: Number(raw.id) || 0,
    establishmentId: Number(raw.establishmentId) || 0,
    userId: Number(raw.userId) || 0,
    locationNote: raw.locationNote == null ? null : String(raw.locationNote),
    status: normalizeStatus(raw.status),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
    items: itemsRaw.map((x) => normalizeLineItem(x as Record<string, unknown>)),
    user: normalizeUser(raw.user),
    establishment: normalizeEstablishment(raw.establishment),
  }
}

function normalizeListPage(raw: unknown): OrdersListPage {
  if (!raw || typeof raw !== 'object') {
    return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }
  }
  const o = raw as Record<string, unknown>
  const itemsRaw = Array.isArray(o.items) ? o.items : []
  return {
    items: itemsRaw.map((x) => normalizeEstablishmentOrder(x as Record<string, unknown>)),
    total: Number(o.total) || 0,
    page: Number(o.page) || 1,
    pageSize: Number(o.pageSize) || 20,
    totalPages: Number(o.totalPages) || 0,
  }
}

function buildQuery(params: EstablishmentOrdersQuery): string {
  const sp = new URLSearchParams()
  if (params.status) sp.set('status', params.status)
  if (params.page != null) sp.set('page', String(params.page))
  if (params.pageSize != null) sp.set('pageSize', String(params.pageSize))
  const q = sp.toString()
  return q ? `?${q}` : ''
}

export async function fetchEstablishmentOrders(
  establishmentId: number,
  params: EstablishmentOrdersQuery,
): Promise<OrdersListPage> {
  const path = `/establishments/${establishmentId}/orders${buildQuery(params)}`
  const raw = await apiGetJson<unknown>(path)
  return normalizeListPage(raw)
}

export async function patchEstablishmentOrderStatus(
  establishmentId: number,
  orderId: number,
  status: OrderStatus,
): Promise<EstablishmentOrder | null> {
  const raw = await apiPatchJson<unknown>(
    `/establishments/${establishmentId}/orders/${orderId}/status`,
    { status },
  )
  if (!raw || typeof raw !== 'object') {
    return null
  }
  return normalizeEstablishmentOrder(raw as Record<string, unknown>)
}
