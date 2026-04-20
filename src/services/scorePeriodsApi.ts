import { apiGetJson } from '@/lib/apiClient'
import type { ScorePeriodClosed, ScorePeriodCurrent, ScorePeriodsPage } from '@/types/scorePeriods'

export interface ScorePeriodsQuery {
  page?: number
  pageSize?: number
}

function normalizeClosed(raw: Record<string, unknown>): ScorePeriodClosed {
  return {
    id: Number(raw.id) || 0,
    periodStartUtc: String(raw.periodStartUtc ?? ''),
    periodEndUtc: String(raw.periodEndUtc ?? ''),
    sumRating: Number(raw.sumRating) || 0,
    feedbackCount: Number(raw.feedbackCount) || 0,
    averageRating: Number(raw.averageRating) || 0,
    closedAt: String(raw.closedAt ?? ''),
  }
}

function normalizeCurrent(raw: unknown): ScorePeriodCurrent | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  return {
    periodStartUtc: String(o.periodStartUtc ?? ''),
    periodEndUtc: String(o.periodEndUtc ?? ''),
    sumRating: Number(o.sumRating) || 0,
    feedbackCount: Number(o.feedbackCount) || 0,
    averageRating: Number(o.averageRating) || 0,
  }
}

function normalizePage(raw: unknown): ScorePeriodsPage {
  if (!raw || typeof raw !== 'object') {
    return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0, currentSession: null }
  }
  const o = raw as Record<string, unknown>
  const itemsRaw = Array.isArray(o.items) ? o.items : []
  return {
    items: itemsRaw.map((x) => normalizeClosed(x as Record<string, unknown>)),
    total: Number(o.total) || 0,
    page: Number(o.page) || 1,
    pageSize: Number(o.pageSize) || 20,
    totalPages: Number(o.totalPages) || 0,
    currentSession: normalizeCurrent(o.currentSession),
  }
}

function buildQuery(params: ScorePeriodsQuery): string {
  const sp = new URLSearchParams()
  if (params.page != null) sp.set('page', String(params.page))
  if (params.pageSize != null) sp.set('pageSize', String(params.pageSize))
  const q = sp.toString()
  return q ? `?${q}` : ''
}

export async function fetchScorePeriods(
  establishmentId: number,
  params: ScorePeriodsQuery = {},
): Promise<ScorePeriodsPage> {
  const path = `/establishments/${establishmentId}/score-periods${buildQuery(params)}`
  const raw = await apiGetJson<unknown>(path)
  return normalizePage(raw)
}
