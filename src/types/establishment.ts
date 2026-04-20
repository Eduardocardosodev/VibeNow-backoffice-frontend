import type {
  DayHoursSlot,
  EstablishmentType,
  OpeningHoursDayKey,
  OpeningHoursPayload,
} from './auth'

export type { DayHoursSlot, EstablishmentType, OpeningHoursDayKey, OpeningHoursPayload }

export interface Establishment {
  id: number
  name: string
  cnpj: string
  address: string
  addressNumber: string
  city: string
  state: string
  zipCode: string
  phone: string
  email: string
  instagram: string | null
  establishmentType: EstablishmentType
  profilePhoto: string | null
  latitude: number
  longitude: number
  score: number
  openingHours: OpeningHoursPayload | null
  /** IANA (ex.: America/Sao_Paulo) — usado para formatar períodos operacionais no portal. */
  operatingTimeZone?: string | null
  ownerUserId: number
  feedbackRewardEnabled: boolean
  feedbackRewardMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface PatchEstablishmentBody {
  name?: string
  cnpj?: string
  address?: string
  addressNumber?: string
  city?: string
  state?: string
  zipCode?: string
  phone?: string
  email?: string
  instagram?: string
  establishmentType?: EstablishmentType
  profilePhoto?: string | null
  latitude?: number
  longitude?: number
  openingHours?: OpeningHoursPayload | null
}
