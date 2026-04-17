export type UserRole =
  | 'NORMAL_USER'
  | 'ADMIN'
  | 'OWNER_ESTABLISHMENT'
  | 'EMPLOYEE_ESTABLISHMENT'

export interface User {
  id: number
  name: string
  phone: string | null
  email: string | null
  role: UserRole
  createdAt: string
  updatedAt: string
}

export interface AuthAccess {
  ownedEstablishments: Array<{
    id: number
    name: string
    cnpj: string
  }>
  employments: Array<{
    establishmentId: number
    establishmentName: string
    role: string
  }>
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
}

export interface LoginEmailResponse extends AuthTokens {}

export interface MeResponse {
  user: User
  access: AuthAccess
}

export type EstablishmentType = 'LOUNGE' | 'PARTY'

export type OpeningHoursDayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export type DayHoursSlot = { open: string; close: string }

/** Chaves só dos dias; cada valor é null ou { open, close } em HH:mm */
export type OpeningHoursPayload = Partial<Record<OpeningHoursDayKey, DayHoursSlot | null>>

export interface RegisterEstablishmentAndOwnerBody {
  name: string
  cnpj: string
  address: string
  addressNumber: string
  city: string
  state: string
  zipCode: string
  phone: string
  email: string
  instagram: string
  establishmentType: EstablishmentType
  latitude: number
  longitude: number
  profilePhoto?: string | null
  openingHours?: OpeningHoursPayload | null
  password: string
  ownerName?: string
}

export interface RegisterEstablishmentAndOwnerResponse extends AuthTokens {
  user: User
  establishmentId: number
}
