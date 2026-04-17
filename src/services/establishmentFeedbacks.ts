import { apiGetJson } from '@/lib/apiClient'
import type {
  EstablishmentFeedbackItem,
  EstablishmentFeedbacksPage,
  EstablishmentFeedbacksQuery,
  FeedbackSentiment,
} from '@/types/establishmentFeedback'

function normalizeSentiment(raw: unknown): FeedbackSentiment {
  if (raw === 'positive' || raw === 'neutral' || raw === 'negative') return raw
  return 'neutral'
}

function clampRating(v: unknown): number {
  const n = Number(v)
  if (!n || Number.isNaN(n)) return 0
  return Math.min(5, Math.max(0, Math.round(n * 10) / 10))
}

function normalizeItem(raw: Record<string, unknown>): EstablishmentFeedbackItem {
  return {
    id: Number(raw.id) || 0,
    userId: Number(raw.userId) || 0,
    establishmentId: Number(raw.establishmentId) || 0,
    rating: clampRating(raw.rating),
    ratingCrowding: clampRating(raw.ratingCrowding),
    ratingAnimation: clampRating(raw.ratingAnimation),
    ratingOrganization: clampRating(raw.ratingOrganization),
    ratingHygiene: clampRating(raw.ratingHygiene),
    ratingAmbience: clampRating(raw.ratingAmbience),
    comment: raw.comment == null ? null : String(raw.comment),
    photoUrl: raw.photoUrl == null || raw.photoUrl === '' ? null : String(raw.photoUrl),
    idempotencyKey:
      raw.idempotencyKey == null || raw.idempotencyKey === '' ? null : String(raw.idempotencyKey),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
    sentiment: normalizeSentiment(raw.sentiment),
  }
}

function normalizePage(raw: unknown): EstablishmentFeedbacksPage {
  if (!raw || typeof raw !== 'object') {
    return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }
  }
  const o = raw as Record<string, unknown>
  const itemsRaw = Array.isArray(o.items) ? o.items : []
  return {
    items: itemsRaw.map((x) => normalizeItem(x as Record<string, unknown>)),
    total: Number(o.total) || 0,
    page: Number(o.page) || 1,
    pageSize: Number(o.pageSize) || 20,
    totalPages: Number(o.totalPages) || 0,
  }
}

function buildQuery(params: EstablishmentFeedbacksQuery): string {
  const sp = new URLSearchParams()
  if (params.from) sp.set('from', params.from)
  if (params.to) sp.set('to', params.to)
  if (params.minRating != null) sp.set('minRating', String(params.minRating))
  if (params.maxRating != null) sp.set('maxRating', String(params.maxRating))
  if (params.hasPhoto === true) sp.set('hasPhoto', 'true')
  if (params.hasPhoto === false) sp.set('hasPhoto', 'false')
  if (params.page != null) sp.set('page', String(params.page))
  if (params.pageSize != null) sp.set('pageSize', String(params.pageSize))
  if (params.sort) sp.set('sort', params.sort)
  const q = sp.toString()
  return q ? `?${q}` : ''
}

export async function fetchEstablishmentFeedbacks(
  establishmentId: number,
  params: EstablishmentFeedbacksQuery,
): Promise<EstablishmentFeedbacksPage> {
  const path = `/feedbacks/establishment/${establishmentId}${buildQuery(params)}`
  const raw = await apiGetJson<unknown>(path)
  return normalizePage(raw)
}
