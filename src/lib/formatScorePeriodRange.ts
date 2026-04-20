import { parseISO } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'

const FALLBACK_TZ = 'America/Sao_Paulo'

/** IANA a partir do GET /establishments/:id (campo opcional no backend). */
export function resolveOperatingTimeZone(
  est: { operatingTimeZone?: string | null } | null | undefined,
): string {
  const tz = est?.operatingTimeZone?.trim()
  if (tz) return tz
  return FALLBACK_TZ
}

const RANGE_FMT = "EEE dd/MM/yyyy · HH:mm"

export function formatOperationalPeriodLabel(
  periodStartUtc: string,
  periodEndUtc: string,
  timeZone: string,
): string {
  try {
    const start = parseISO(periodStartUtc)
    const end = parseISO(periodEndUtc)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return `${periodStartUtc} → ${periodEndUtc}`
    }
    const a = formatInTimeZone(start, timeZone, RANGE_FMT, { locale: ptBR })
    const b = formatInTimeZone(end, timeZone, RANGE_FMT, { locale: ptBR })
    return `${a} → ${b}`
  } catch {
    return `${periodStartUtc} → ${periodEndUtc}`
  }
}

export function formatInstantInOperatingTz(isoUtc: string, timeZone: string): string {
  try {
    const d = parseISO(isoUtc)
    if (Number.isNaN(d.getTime())) return isoUtc
    return formatInTimeZone(d, timeZone, "dd/MM/yyyy · HH:mm", { locale: ptBR })
  } catch {
    return isoUtc
  }
}
