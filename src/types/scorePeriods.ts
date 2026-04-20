/** Resposta de GET /establishments/:id/score-periods */

export interface ScorePeriodClosed {
  id: number
  periodStartUtc: string
  periodEndUtc: string
  sumRating: number
  feedbackCount: number
  averageRating: number
  closedAt: string
}

export interface ScorePeriodCurrent {
  periodStartUtc: string
  periodEndUtc: string
  sumRating: number
  feedbackCount: number
  averageRating: number
}

export interface ScorePeriodsPage {
  items: ScorePeriodClosed[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  currentSession: ScorePeriodCurrent | null
}
