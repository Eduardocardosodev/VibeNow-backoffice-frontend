import { apiGetJson } from '@/lib/apiClient'
import type {
  FeedbackInsightsResponse,
  InsightBucketGranularity,
} from '@/types/feedbackInsights'

export interface FeedbackInsightsQuery {
  from?: string
  to?: string
  bucket?: InsightBucketGranularity
  liveMinutes?: number
}

function buildQuery(params: FeedbackInsightsQuery): string {
  const sp = new URLSearchParams()
  if (params.from) sp.set('from', params.from)
  if (params.to) sp.set('to', params.to)
  if (params.bucket) sp.set('bucket', params.bucket)
  if (params.liveMinutes != null) sp.set('liveMinutes', String(params.liveMinutes))
  const q = sp.toString()
  return q ? `?${q}` : ''
}

export async function fetchFeedbackInsights(
  establishmentId: number,
  params: FeedbackInsightsQuery,
): Promise<FeedbackInsightsResponse> {
  const path = `/establishments/${establishmentId}/feedback-insights${buildQuery(params)}`
  return apiGetJson<FeedbackInsightsResponse>(path)
}

/** Normaliza totais parciais da API */
export function normalizeTotals(
  raw: Partial<FeedbackInsightsResponse['totals']> | undefined | null,
): FeedbackInsightsResponse['totals'] {
  if (!raw || typeof raw !== 'object') {
    return { count: 0, averageRating: 0, positive: 0, neutral: 0, negative: 0 }
  }
  return {
    count: Number(raw.count) || 0,
    averageRating: Number(raw.averageRating) || 0,
    positive: Number(raw.positive) || 0,
    neutral: Number(raw.neutral) || 0,
    negative: Number(raw.negative) || 0,
  }
}

export function bucketStartsAtIso(b: { bucketStart?: string; startsAt?: string; start?: string; startAt?: string; at?: string }): string | null {
  return b.bucketStart ?? b.startsAt ?? b.start ?? b.startAt ?? b.at ?? null
}
