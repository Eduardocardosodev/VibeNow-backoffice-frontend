export type EventListType = 'GENERAL' | 'FREE_LIST' | 'FRIEND_LIST' | 'VIP'

export const EVENT_LIST_TYPE_OPTIONS: { value: EventListType; label: string }[] = [
  { value: 'GENERAL', label: 'Geral' },
  { value: 'FREE_LIST', label: 'Lista free' },
  { value: 'FRIEND_LIST', label: 'Lista de amigos' },
  { value: 'VIP', label: 'VIP' },
]

export function eventListTypeLabel(t: string): string {
  return EVENT_LIST_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t
}

export interface ScheduledEvent {
  id: number
  establishmentId: number
  name: string
  description: string | null
  attractions: string | null
  dj: string | null
  priceInfo: string | null
  eventStartsAt: string
  eventEndsAt: string
  listType: EventListType
  posterImageUrl: string | null
  offersTableReservation: boolean
  tablePeopleCapacity: number | null
  tablesAvailable: number | null
  tablePrice: number | null
  offersBoothReservation: boolean
  boothPeopleCapacity: number | null
  boothsAvailable: number | null
  boothPrice: number | null
  createdAt: string
  updatedAt: string
}

export interface CreateScheduledEventBody {
  establishmentId: number
  name: string
  description?: string | null
  attractions?: string | null
  dj?: string | null
  priceInfo?: string | null
  eventStartsAt: string
  eventEndsAt: string
  listType?: EventListType
  posterImageUrl?: string | null
  offersTableReservation: boolean
  offersBoothReservation: boolean
  tablePeopleCapacity?: number | null
  tablesAvailable?: number | null
  tablePrice?: number | null
  boothPeopleCapacity?: number | null
  boothsAvailable?: number | null
  boothPrice?: number | null
}

export type PatchScheduledEventBody = Partial<Omit<CreateScheduledEventBody, 'establishmentId'>>
