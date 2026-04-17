import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subHours,
  subMonths,
  subWeeks,
} from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'

export const SP_TZ = 'America/Sao_Paulo'

function zonedNow(now: Date): Date {
  return toZonedTime(now, SP_TZ)
}

/** Início do dia civil em São Paulo → instante UTC */
export function spStartOfDayUtc(reference: Date = new Date()): Date {
  const z = zonedNow(reference)
  return fromZonedTime(startOfDay(z), SP_TZ)
}

export function spEndOfDayUtc(reference: Date = new Date()): Date {
  const z = zonedNow(reference)
  return fromZonedTime(endOfDay(z), SP_TZ)
}

/** Hoje 00:00 SP até `now` (UTC ISO para a API) */
export function spTodayToNowRange(now: Date = new Date()): { from: string; to: string } {
  return {
    from: spStartOfDayUtc(now).toISOString(),
    to: now.toISOString(),
  }
}

/** Última hora até agora (instantes UTC em ISO) — preset operacional */
export function utcLastHourToNowRange(now: Date = new Date()): { from: string; to: string } {
  return {
    from: subHours(now, 1).toISOString(),
    to: now.toISOString(),
  }
}

/** Instante (início do dia) de ontem em SP — útil para filtrar buckets por dia civil */
export function spYesterdayInstantForCalendarMatcher(now: Date = new Date()): Date {
  const z = zonedNow(now)
  const y = subDays(z, 1)
  return fromZonedTime(startOfDay(y), SP_TZ)
}

/** Ontem 00:00–23:59:59 SP */
export function spYesterdayFullDayRange(now: Date = new Date()): { from: string; to: string } {
  const z = zonedNow(now)
  const y = subDays(z, 1)
  const from = fromZonedTime(startOfDay(y), SP_TZ)
  const to = fromZonedTime(endOfDay(y), SP_TZ)
  return { from: from.toISOString(), to: to.toISOString() }
}

/** Semana corrente (segunda 00:00 SP) até agora */
export function spThisWeekToNowRange(now: Date = new Date()): { from: string; to: string } {
  const z = zonedNow(now)
  const ws = startOfWeek(z, { weekStartsOn: 1 })
  const from = fromZonedTime(ws, SP_TZ)
  return { from: from.toISOString(), to: now.toISOString() }
}

/** Semana anterior completa (seg–dom) em SP */
export function spLastWeekFullRange(now: Date = new Date()): { from: string; to: string } {
  const z = zonedNow(now)
  const prev = subWeeks(z, 1)
  const ws = startOfWeek(prev, { weekStartsOn: 1 })
  const we = endOfWeek(prev, { weekStartsOn: 1 })
  return {
    from: fromZonedTime(ws, SP_TZ).toISOString(),
    to: fromZonedTime(we, SP_TZ).toISOString(),
  }
}

/** Mês corrente (dia 1 00:00 SP) até agora */
export function spThisMonthToNowRange(now: Date = new Date()): { from: string; to: string } {
  const z = zonedNow(now)
  const ms = startOfMonth(z)
  const from = fromZonedTime(ms, SP_TZ)
  return { from: from.toISOString(), to: now.toISOString() }
}

/** Mês civil anterior completo em SP */
export function spLastMonthFullRange(now: Date = new Date()): { from: string; to: string } {
  const z = zonedNow(now)
  const prev = subMonths(z, 1)
  const from = fromZonedTime(startOfMonth(prev), SP_TZ)
  const to = fromZonedTime(endOfMonth(prev), SP_TZ)
  return { from: from.toISOString(), to: to.toISOString() }
}

/** Hora 0–23 no fuso de São Paulo para um instante UTC */
export function utcToSpHour(isoUtc: string): number {
  const d = new Date(isoUtc)
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SP_TZ,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(d)
  const h = parts.find((p) => p.type === 'hour')?.value
  return h != null ? Number.parseInt(h, 10) : 0
}

export function formatSpTimeLabel(isoUtc: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: SP_TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoUtc))
}

/** Data + hora no fuso de São Paulo (lista de feedbacks, etc.) */
export function formatSpDateTimeLabel(isoUtc: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: SP_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoUtc))
}

export function formatSpDateLabel(isoUtc: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: SP_TZ,
    day: '2-digit',
    month: 'short',
  }).format(new Date(isoUtc))
}

export function formatSpWeekdayShort(isoUtc: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: SP_TZ,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(isoUtc))
}

export function sameSpCalendarDay(isoUtc: string, reference: Date = new Date()): boolean {
  const key = (x: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: SP_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(x)
  return key(new Date(isoUtc)) === key(reference)
}
