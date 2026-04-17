import {
  ApiError,
  apiDelete,
  apiGetJson,
  apiPatchFormData,
  apiPostFormData,
  apiPostJson,
} from '@/lib/apiClient'
import type { Menu, MenuItem, MenuItemCreateBody } from '@/types/menu'

function normalizeItem(raw: Record<string, unknown>, fallbackMenuId?: number): MenuItem {
  return {
    id: Number(raw.id) || 0,
    menuId: Number(raw.menuId ?? fallbackMenuId) || 0,
    name: String(raw.name ?? ''),
    description: raw.description == null ? null : String(raw.description),
    photoMenuItem:
      raw.photoMenuItem == null || raw.photoMenuItem === '' ? null : String(raw.photoMenuItem),
    price: Number(raw.price) || 0,
    type: String(raw.type ?? 'FOOD'),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
  }
}

function normalizeMenu(raw: Record<string, unknown>): Menu {
  const id = Number(raw.id) || 0
  const itemsRaw = Array.isArray(raw.items) ? raw.items : []
  return {
    id,
    establishmentId: Number(raw.establishmentId) || 0,
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
    items: itemsRaw.map((x) => normalizeItem(x as Record<string, unknown>, id)),
  }
}

export async function fetchMenuByEstablishment(establishmentId: number): Promise<Menu | null> {
  try {
    const data = await apiGetJson<unknown>(`/menu/establishment/${establishmentId}`)
    if (data == null) return null
    if (typeof data !== 'object') return null
    return normalizeMenu(data as Record<string, unknown>)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null
    throw e
  }
}

/** Quando o POST/PATCH devolve 200/204 sem corpo, reidrata a partir do menu atual. */
async function menuAfterWrite(menuId: number): Promise<Menu> {
  return fetchMenuById(menuId)
}

export async function fetchMenuById(menuId: number): Promise<Menu> {
  const data = await apiGetJson<unknown>(`/menu/${menuId}`)
  if (!data || typeof data !== 'object') {
    throw new Error('Resposta de cardápio inválida')
  }
  return normalizeMenu(data as Record<string, unknown>)
}

export async function createMenu(establishmentId: number, items: MenuItemCreateBody[]): Promise<Menu> {
  const data = await apiPostJson<unknown>('/menu', { establishmentId, items })
  if (data && typeof data === 'object') {
    return normalizeMenu(data as Record<string, unknown>)
  }
  const refetched = await fetchMenuByEstablishment(establishmentId)
  if (refetched) return refetched
  throw new Error('Cardápio criado mas a API não devolveu dados. Use o botão Atualizar.')
}

export async function deleteMenu(menuId: number): Promise<void> {
  await apiDelete(`/menu/${menuId}`)
}

/**
 * Multipart para POST/PATCH `/menu/:menuId/items/upload` e `/menu/:menuId/items/:itemId/upload`.
 * Não definir Content-Type manualmente — o browser envia multipart com boundary.
 */
export interface MenuItemWriteInput {
  name: string
  description: string | null
  price: number
  type: string
  /** Campo do form tem de ser exatamente `photo`. */
  photo?: File | null
  /** Sem ficheiro: URL externa válida (não combinar com `photo`). */
  photoMenuItem?: string | null
  /** PATCH: remover foto sem enviar ficheiro novo (envia `photoMenuItem` vazio). */
  clearPhoto?: boolean
}

function buildMenuItemFormData(input: MenuItemWriteInput): FormData {
  const fd = new FormData()
  fd.append('name', input.name)
  fd.append('description', input.description?.trim() ?? '')
  fd.append('price', String(input.price))
  fd.append('type', input.type)
  if (input.photo) {
    fd.append('photo', input.photo)
  } else if (input.clearPhoto) {
    fd.append('photoMenuItem', '')
  } else if (input.photoMenuItem != null && String(input.photoMenuItem).trim() !== '') {
    fd.append('photoMenuItem', String(input.photoMenuItem).trim())
  }
  return fd
}

export async function addMenuItem(menuId: number, input: MenuItemWriteInput): Promise<MenuItem> {
  const fd = buildMenuItemFormData(input)
  const data = await apiPostFormData<unknown>(`/menu/${menuId}/items/upload`, fd)
  if (data && typeof data === 'object') {
    return normalizeItem(data as Record<string, unknown>, menuId)
  }
  const menu = await menuAfterWrite(menuId)
  const name = input.name.trim()
  const price = Number(input.price)
  const candidates = menu.items.filter(
    (i) => i.name === name && Number(i.price) === price && i.type === input.type,
  )
  const byId = [...candidates].sort((a, b) => b.id - a.id)[0]
  if (byId) return byId
  const newest = [...menu.items].sort((a, b) => b.id - a.id)[0]
  if (newest) return newest
  throw new Error('Item adicionado mas não foi possível ler o registo. Use o botão Atualizar.')
}

export async function patchMenuItem(
  menuId: number,
  itemId: number,
  input: MenuItemWriteInput,
): Promise<MenuItem> {
  const fd = buildMenuItemFormData(input)
  const data = await apiPatchFormData<unknown>(
    `/menu/${menuId}/items/${itemId}/upload`,
    fd,
  )
  if (data && typeof data === 'object') {
    return normalizeItem(data as Record<string, unknown>, menuId)
  }
  const menu = await menuAfterWrite(menuId)
  const found = menu.items.find((i) => i.id === itemId)
  if (found) return found
  throw new Error('Item atualizado mas não foi encontrado ao recarregar. Use o botão Atualizar.')
}

export async function deleteMenuItem(menuId: number, itemId: number): Promise<void> {
  await apiDelete(`/menu/${menuId}/items/${itemId}`)
}
