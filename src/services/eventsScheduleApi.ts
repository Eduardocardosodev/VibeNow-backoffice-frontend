import {
  apiDelete,
  apiGetJson,
  apiPatchFormData,
  apiPatchJson,
  apiPostFormData,
  apiPostJson,
} from '@/lib/apiClient'
import type {
  CreateScheduledEventBody,
  EventListType,
  PatchScheduledEventBody,
  ScheduledEvent,
} from '@/types/scheduledEvent'

function normalizeListType(raw: unknown): EventListType {
  const s = String(raw ?? 'GENERAL')
  if (s === 'FREE_LIST' || s === 'FRIEND_LIST' || s === 'VIP') return s
  return 'GENERAL'
}

export function normalizeScheduledEvent(raw: Record<string, unknown>): ScheduledEvent {
  return {
    id: Number(raw.id) || 0,
    establishmentId: Number(raw.establishmentId) || 0,
    name: String(raw.name ?? ''),
    description: raw.description == null ? null : String(raw.description),
    attractions: raw.attractions == null ? null : String(raw.attractions),
    dj: raw.dj == null ? null : String(raw.dj),
    priceInfo: raw.priceInfo == null ? null : String(raw.priceInfo),
    eventStartsAt: String(raw.eventStartsAt ?? ''),
    eventEndsAt: String(raw.eventEndsAt ?? ''),
    listType: normalizeListType(raw.listType),
    posterImageUrl:
      raw.posterImageUrl == null || raw.posterImageUrl === '' ? null : String(raw.posterImageUrl),
    offersTableReservation: Boolean(raw.offersTableReservation),
    tablePeopleCapacity: raw.tablePeopleCapacity == null ? null : Number(raw.tablePeopleCapacity),
    tablesAvailable: raw.tablesAvailable == null ? null : Number(raw.tablesAvailable),
    tablePrice: raw.tablePrice == null ? null : Number(raw.tablePrice),
    offersBoothReservation: Boolean(raw.offersBoothReservation),
    boothPeopleCapacity: raw.boothPeopleCapacity == null ? null : Number(raw.boothPeopleCapacity),
    boothsAvailable: raw.boothsAvailable == null ? null : Number(raw.boothsAvailable),
    boothPrice: raw.boothPrice == null ? null : Number(raw.boothPrice),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
  }
}

function normalizeEventList(raw: unknown): ScheduledEvent[] {
  if (!Array.isArray(raw)) return []
  return raw.map((x) => normalizeScheduledEvent(x as Record<string, unknown>))
}

export async function fetchEstablishmentScheduledEvents(
  establishmentId: number,
): Promise<ScheduledEvent[]> {
  const raw = await apiGetJson<unknown>(`/events-schedule/establishment/${establishmentId}`)
  return normalizeEventList(raw)
}

export async function fetchScheduledEventById(id: number): Promise<ScheduledEvent> {
  const raw = await apiGetJson<unknown>(`/events-schedule/${id}`)
  if (!raw || typeof raw !== 'object') {
    throw new Error('Evento inválido')
  }
  return normalizeScheduledEvent(raw as Record<string, unknown>)
}

export async function createScheduledEvent(body: CreateScheduledEventBody): Promise<ScheduledEvent> {
  const raw = await apiPostJson<unknown>('/events-schedule', body)
  if (!raw || typeof raw !== 'object') {
    throw new Error('Resposta ao criar evento inválida')
  }
  return normalizeScheduledEvent(raw as Record<string, unknown>)
}

export async function patchScheduledEvent(
  id: number,
  body: PatchScheduledEventBody,
): Promise<ScheduledEvent | null> {
  const raw = await apiPatchJson<unknown>(`/events-schedule/${id}`, body)
  if (!raw || typeof raw !== 'object') {
    return null
  }
  return normalizeScheduledEvent(raw as Record<string, unknown>)
}

function appendBool(fd: FormData, key: string, value: boolean) {
  fd.append(key, value ? 'true' : 'false')
}

/** Campos multipart para POST /events-schedule/upload e PATCH /events-schedule/:id/upload (campo ficheiro `photo`). */
export interface ScheduledEventUploadInput {
  establishmentId?: number
  name: string
  description: string | null
  attractions: string | null
  dj: string | null
  priceInfo: string | null
  eventStartsAt: string
  eventEndsAt: string
  listType: string
  offersTableReservation: boolean
  offersBoothReservation: boolean
  tablePeopleCapacity: number | null
  tablesAvailable: number | null
  tablePrice: number | null
  boothPeopleCapacity: number | null
  boothsAvailable: number | null
  boothPrice: number | null
  photo?: File | null
  posterImageUrl?: string | null
  clearPoster?: boolean
}

function buildScheduledEventFormData(
  input: ScheduledEventUploadInput,
  mode: 'create' | 'patch',
): FormData {
  const fd = new FormData()
  if (mode === 'create' && input.establishmentId != null) {
    fd.append('establishmentId', String(input.establishmentId))
  }
  fd.append('name', input.name)
  fd.append('description', input.description?.trim() ?? '')
  fd.append('attractions', input.attractions?.trim() ?? '')
  fd.append('dj', input.dj?.trim() ?? '')
  fd.append('priceInfo', input.priceInfo?.trim() ?? '')
  fd.append('eventStartsAt', input.eventStartsAt)
  fd.append('eventEndsAt', input.eventEndsAt)
  fd.append('listType', input.listType)
  appendBool(fd, 'offersTableReservation', input.offersTableReservation)
  appendBool(fd, 'offersBoothReservation', input.offersBoothReservation)
  if (input.offersTableReservation) {
    fd.append('tablePeopleCapacity', String(input.tablePeopleCapacity!))
    fd.append('tablesAvailable', String(input.tablesAvailable!))
    fd.append('tablePrice', String(input.tablePrice!))
  }
  if (input.offersBoothReservation) {
    fd.append('boothPeopleCapacity', String(input.boothPeopleCapacity!))
    fd.append('boothsAvailable', String(input.boothsAvailable!))
    fd.append('boothPrice', String(input.boothPrice!))
  }
  if (input.photo) {
    fd.append('photo', input.photo)
  } else if (input.clearPoster) {
    fd.append('posterImageUrl', '')
  } else if (input.posterImageUrl != null && input.posterImageUrl.trim() !== '') {
    fd.append('posterImageUrl', input.posterImageUrl.trim())
  }
  return fd
}

export async function createScheduledEventUpload(
  input: ScheduledEventUploadInput,
): Promise<ScheduledEvent> {
  const fd = buildScheduledEventFormData(input, 'create')
  const raw = await apiPostFormData<unknown>('/events-schedule/upload', fd)
  if (!raw || typeof raw !== 'object') {
    throw new Error('Resposta ao criar evento inválida')
  }
  return normalizeScheduledEvent(raw as Record<string, unknown>)
}

export async function patchScheduledEventUpload(
  id: number,
  input: ScheduledEventUploadInput,
): Promise<ScheduledEvent> {
  const fd = buildScheduledEventFormData(input, 'patch')
  const raw = await apiPatchFormData<unknown>(`/events-schedule/${id}/upload`, fd)
  if (raw && typeof raw === 'object') {
    return normalizeScheduledEvent(raw as Record<string, unknown>)
  }
  return fetchScheduledEventById(id)
}

export async function deleteScheduledEvent(id: number): Promise<void> {
  await apiDelete(`/events-schedule/${id}`)
}

export async function fetchEventRegistrationsCount(eventId: number): Promise<number> {
  const raw = await apiGetJson<{ count?: number }>(
    `/events-schedule/${eventId}/registrations/count`,
  )
  return Number(raw?.count) || 0
}
