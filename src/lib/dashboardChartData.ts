import { formatSpWeekdayShort, sameSpCalendarDay, utcToSpHour } from '@/lib/datetimeSp'
import { bucketStartsAtIso } from '@/services/feedbackInsights'
import type { InsightBucket } from '@/types/feedbackInsights'

type HourAgg = {
  total: number
  positive: number
  neutral: number
  negative: number
  ratingSum: number
  ratingW: number
}

function aggregateHourlyForSpDay(buckets: InsightBucket[], dayRef: Date): HourAgg[] {
  const rows: HourAgg[] = Array.from({ length: 24 }, () => ({
    total: 0,
    positive: 0,
    neutral: 0,
    negative: 0,
    ratingSum: 0,
    ratingW: 0,
  }))
  for (const b of buckets) {
    const iso = bucketStartsAtIso(b)
    if (!iso || !sameSpCalendarDay(iso, dayRef)) continue
    const h = utcToSpHour(iso)
    if (h < 0 || h >= 24) continue
    rows[h].total += b.count
    rows[h].positive += b.positive
    rows[h].neutral += b.neutral
    rows[h].negative += b.negative
    rows[h].ratingSum += b.averageRating * b.count
    rows[h].ratingW += b.count
  }
  return rows
}

export type HourlyChartRow = {
  h: string
  hoje: number
  ontem: number
  media: number
  positivos: number
  neutros: number
  negativos: number
}

export function buildHourlyChartRows(
  todayBuckets: InsightBucket[],
  yesterdayBuckets: InsightBucket[],
  now: Date,
  yesterdayRef: Date,
): HourlyChartRow[] {
  const t = aggregateHourlyForSpDay(todayBuckets, now)
  const y = aggregateHourlyForSpDay(yesterdayBuckets, yesterdayRef)
  return Array.from({ length: 24 }, (_, i) => ({
    h: `${i.toString().padStart(2, '0')}h`,
    hoje: t[i].total,
    ontem: y[i].total,
    media: t[i].ratingW > 0 ? Math.round((t[i].ratingSum / t[i].ratingW) * 100) / 100 : 0,
    positivos: t[i].positive,
    neutros: t[i].neutral,
    negativos: t[i].negative,
  }))
}

export type WeekChartRow = { dia: string; volume: number; media: number; iso: string }

export function buildWeekChartRows(buckets: InsightBucket[]): WeekChartRow[] {
  const rows: WeekChartRow[] = []
  for (const b of buckets) {
    const iso = bucketStartsAtIso(b)
    if (!iso) continue
    rows.push({
      iso,
      dia: formatSpWeekdayShort(iso),
      volume: b.count,
      media: b.averageRating,
    })
  }
  return rows.sort((a, b) => a.iso.localeCompare(b.iso))
}
