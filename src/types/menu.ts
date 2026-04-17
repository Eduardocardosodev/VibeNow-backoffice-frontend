/** Espelha o enum do backend (`MenuItemType` / equivalente). */
export const MENU_ITEM_TYPE_OPTIONS = [
  { value: 'ALCOHOLIC_DRINK', label: 'Bebida alcoólica' },
  { value: 'NON_ALCOHOLIC_DRINK', label: 'Bebida sem álcool' },
  { value: 'COMBO', label: 'Combo' },
  { value: 'BOTTLE', label: 'Garrafa' },
  { value: 'FOOD', label: 'Comida' },
  { value: 'HOOKAH', label: 'Narguilé' },
] as const

export type MenuItemTypeValue = (typeof MENU_ITEM_TYPE_OPTIONS)[number]['value'] | string

export interface MenuItem {
  id: number
  menuId: number
  name: string
  description: string | null
  photoMenuItem: string | null
  price: number
  type: string
  createdAt: string
  updatedAt: string
}

export interface Menu {
  id: number
  establishmentId: number
  createdAt: string
  updatedAt: string
  items: MenuItem[]
}

export interface MenuItemCreateBody {
  name: string
  description?: string | null
  photoMenuItem?: string | null
  price: number
  type: string
}

export function menuItemTypeLabel(type: string): string {
  const o = MENU_ITEM_TYPE_OPTIONS.find((x) => x.value === type)
  return o?.label ?? type
}
