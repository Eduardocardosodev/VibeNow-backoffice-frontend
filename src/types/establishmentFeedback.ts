export type FeedbackSentiment = 'positive' | 'neutral' | 'negative'

export const FEEDBACK_TOPIC_LABELS: Record<string, string> = {
  ratingCrowding: 'Lotação',
  ratingAnimation: 'Animação',
  ratingOrganization: 'Organização',
  ratingHygiene: 'Higiene',
  ratingAmbience: 'Clima / Pessoas',
}

export const FEEDBACK_TOPIC_KEYS = [
  'ratingCrowding',
  'ratingAnimation',
  'ratingOrganization',
  'ratingHygiene',
  'ratingAmbience',
] as const

export type FeedbackTopicKey = (typeof FEEDBACK_TOPIC_KEYS)[number]

export interface EstablishmentFeedbackItem {
  id: number
  userId: number
  establishmentId: number
  rating: number
  ratingCrowding: number
  ratingAnimation: number
  ratingOrganization: number
  ratingHygiene: number
  ratingAmbience: number
  comment: string | null
  photoUrl: string | null
  idempotencyKey: string | null
  createdAt: string
  updatedAt: string
  sentiment: FeedbackSentiment
}

export interface EstablishmentFeedbacksPage {
  items: EstablishmentFeedbackItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface EstablishmentFeedbacksQuery {
  from?: string
  to?: string
  minRating?: number
  maxRating?: number
  hasPhoto?: boolean
  page?: number
  pageSize?: number
  sort?: 'desc' | 'asc'
}
