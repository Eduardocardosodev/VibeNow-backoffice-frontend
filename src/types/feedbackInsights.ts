/** Resposta de GET /establishments/:id/feedback-insights */

export interface InsightTotals {
  count: number
  averageRating: number
  positive: number
  neutral: number
  negative: number
}

export type SentimentRules = Record<string, unknown>

export interface InsightBucket extends InsightTotals {
  /** Início do bucket em ISO 8601 (UTC) — nome pode variar no backend */
  bucketStart?: string
  startsAt?: string
  start?: string
  startAt?: string
  at?: string
}

export interface FeedbackInsightsResponse {
  totals: InsightTotals
  sentimentRules?: SentimentRules
  buckets: InsightBucket[]
  peakPositivePraise: InsightBucket | null
  peakPositivePraiseHint: string | null
  /** Presente quando `liveMinutes` é enviado na query */
  live?: InsightTotals
}

export type InsightBucketGranularity = 'hour' | 'day'
