import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  CalendarDays,
  ChefHat,
  MessageSquareText,
  Megaphone,
  ShoppingBag,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useAuth } from '@/contexts'
import { HourlyVolumeChart } from '@/components/dashboard/FeedbackCharts'
import { buildHourlyChartRows } from '@/lib/dashboardChartData'
import {
  spTodayToNowRange,
  spYesterdayFullDayRange,
  spYesterdayInstantForCalendarMatcher,
  formatSpDateLabel,
} from '@/lib/datetimeSp'
import {
  fetchFeedbackInsights,
  normalizeTotals,
} from '@/services/feedbackInsights'
import { fetchEstablishmentOrders } from '@/services/ordersApi'
import { fetchEmployees } from '@/services/employeeApi'
import { fetchEstablishmentScheduledEvents, fetchEventRegistrationsCount } from '@/services/eventsScheduleApi'
import { fetchMenuByEstablishment } from '@/services/menuApi'
import { fetchActiveQuotesByEstablishment } from '@/services/quotesApi'
import { fetchEstablishment } from '@/services/establishmentApi'
import { fetchEstablishmentFeedbacks } from '@/services/establishmentFeedbacks'
import { ApiError } from '@/lib/apiClient'
import { orderStatusLabel } from '@/types/order'
import type { FeedbackInsightsResponse, InsightTotals } from '@/types/feedbackInsights'
import type { Establishment } from '@/types/establishment'
import type { EstablishmentOrder } from '@/types/order'
import type { EmployeeListItem } from '@/types/employee'
import type { ScheduledEvent } from '@/types/scheduledEvent'
import type { Menu } from '@/types/menu'
import type { Quote } from '@/types/quote'
import type { EstablishmentFeedbackItem, FeedbackSentiment } from '@/types/establishmentFeedback'
import type { HourlyChartRow } from '@/lib/dashboardChartData'
import '@/styles/overview.css'

const LIVE_MINUTES = 30

function safeInsights(raw: unknown): FeedbackInsightsResponse {
  const r = raw as Partial<FeedbackInsightsResponse>
  const buckets = Array.isArray(r.buckets) ? r.buckets : []
  return {
    totals: normalizeTotals(r.totals),
    sentimentRules: r.sentimentRules,
    buckets: buckets.map((b) => ({ ...normalizeTotals(b), ...b })),
    peakPositivePraise: r.peakPositivePraise
      ? { ...normalizeTotals(r.peakPositivePraise), ...r.peakPositivePraise }
      : null,
    peakPositivePraiseHint: r.peakPositivePraiseHint ?? null,
    live: r.live != null ? normalizeTotals(r.live) : undefined,
  }
}

function liveMoodCopy(live: InsightTotals | undefined): { title: string; sub: string; tone: 'good' | 'warn' | 'neutral' | 'quiet' } {
  if (!live || live.count === 0) {
    return { title: 'Sem sinais recentes', sub: 'Ainda não há feedbacks na janela ao vivo.', tone: 'quiet' }
  }
  const pos = live.positive / live.count
  const neg = live.negative / live.count
  if (pos >= 0.6 && neg <= 0.15) {
    return { title: 'Casa em alta', sub: 'A maioria dos feedbacks recentes é positiva.', tone: 'good' }
  }
  if (neg >= 0.35) {
    return { title: 'Atenção', sub: 'Subida de avaliações negativas neste intervalo.', tone: 'warn' }
  }
  if (pos >= neg) {
    return { title: 'Clima estável', sub: 'Saldo dos feedbacks recentes é favorável ou neutro.', tone: 'neutral' }
  }
  return { title: 'Momento misto', sub: 'Feedbacks recentes equilibrados entre notas.', tone: 'neutral' }
}

function formatDelta(current: number, baseline: number): { text: string; direction: 'up' | 'down' | 'flat' } {
  if (baseline === 0) {
    if (current === 0) return { text: '—', direction: 'flat' }
    return { text: '+∞', direction: 'up' }
  }
  const pct = Math.round(((current - baseline) / baseline) * 100)
  const text = `${pct >= 0 ? '+' : ''}${pct}%`
  return { text, direction: pct >= 0 ? 'up' : 'down' }
}

function sentimentColor(s: FeedbackSentiment): string {
  if (s === 'positive') return 'var(--color-primary)'
  if (s === 'negative') return 'var(--color-error)'
  return 'var(--color-text-secondary)'
}

function sentimentLabel(s: FeedbackSentiment): string {
  if (s === 'positive') return 'Positivo'
  if (s === 'negative') return 'Negativo'
  return 'Neutro'
}

function orderStatusCls(status: string): string {
  if (status === 'PENDING') return 'ov-badge--pending'
  if (status === 'IN_PROGRESS') return 'ov-badge--progress'
  if (status === 'READY') return 'ov-badge--ready'
  if (status === 'DELIVERED') return 'ov-badge--delivered'
  return 'ov-badge--cancelled'
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

interface OverviewData {
  establishment: Establishment | null
  todayInsights: FeedbackInsightsResponse | null
  yesterdayInsights: FeedbackInsightsResponse | null
  yesterdayHourly: FeedbackInsightsResponse | null
  recentOrders: EstablishmentOrder[]
  pendingOrdersCount: number
  inProgressOrdersCount: number
  employees: EmployeeListItem[]
  events: ScheduledEvent[]
  eventRegistrations: Map<number, number>
  menu: Menu | null
  activeQuotes: Quote[]
  recentFeedbacks: EstablishmentFeedbackItem[]
}

export function OverviewDashboard() {
  const { user, access, activeEstablishmentId, selectEstablishment, logout } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<OverviewData | null>(null)

  const establishmentOptions = useMemo(() => {
    const m = new Map<number, string>()
    access?.ownedEstablishments.forEach((e) => m.set(e.id, e.name))
    access?.employments.forEach((e) => m.set(e.establishmentId, e.establishmentName))
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1], 'pt'))
  }, [access])

  useEffect(() => {
    if (activeEstablishmentId == null && establishmentOptions.length === 1) {
      selectEstablishment(establishmentOptions[0][0])
    }
  }, [activeEstablishmentId, establishmentOptions, selectEstablishment])

  const loadAll = useCallback(async () => {
    if (activeEstablishmentId == null) {
      setLoading(false)
      return
    }
    setError(null)
    setLoading(true)
    const id = activeEstablishmentId
    const now = new Date()
    const todayRange = spTodayToNowRange(now)
    const yRange = spYesterdayFullDayRange(now)

    try {
      const [
        todayRaw,
        yHourlyRaw,
        yDayRaw,
        recentOrdersPage,
        pendingPage,
        progressPage,
        employees,
        events,
        menu,
        activeQuotes,
        establishment,
        feedbacksPage,
      ] = await Promise.all([
        fetchFeedbackInsights(id, { from: todayRange.from, to: todayRange.to, bucket: 'hour', liveMinutes: LIVE_MINUTES }),
        fetchFeedbackInsights(id, { ...yRange, bucket: 'hour' }),
        fetchFeedbackInsights(id, { ...yRange, bucket: 'day' }),
        fetchEstablishmentOrders(id, { pageSize: 5 }),
        fetchEstablishmentOrders(id, { status: 'PENDING', pageSize: 1 }),
        fetchEstablishmentOrders(id, { status: 'IN_PROGRESS', pageSize: 1 }),
        fetchEmployees(id),
        fetchEstablishmentScheduledEvents(id),
        fetchMenuByEstablishment(id),
        fetchActiveQuotesByEstablishment(id),
        fetchEstablishment(id),
        fetchEstablishmentFeedbacks(id, { pageSize: 5, sort: 'desc' }),
      ])

      const upcomingEvents = events
        .filter((e) => new Date(e.eventStartsAt).getTime() > Date.now())
        .sort((a, b) => new Date(a.eventStartsAt).getTime() - new Date(b.eventStartsAt).getTime())

      const registrations = new Map<number, number>()
      if (upcomingEvents.length > 0) {
        const counts = await Promise.all(
          upcomingEvents.slice(0, 5).map((e) => fetchEventRegistrationsCount(e.id)),
        )
        upcomingEvents.slice(0, 5).forEach((e, i) => registrations.set(e.id, counts[i]))
      }

      setData({
        establishment,
        todayInsights: safeInsights(todayRaw),
        yesterdayInsights: safeInsights(yDayRaw),
        yesterdayHourly: safeInsights(yHourlyRaw),
        recentOrders: recentOrdersPage.items,
        pendingOrdersCount: pendingPage.total,
        inProgressOrdersCount: progressPage.total,
        employees,
        events: upcomingEvents,
        eventRegistrations: registrations,
        menu,
        activeQuotes,
        recentFeedbacks: feedbacksPage.items,
      })
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Erro ao carregar dados'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [activeEstablishmentId])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  useEffect(() => {
    if (activeEstablishmentId == null) return
    const t = setInterval(() => void loadAll(), 90_000)
    return () => clearInterval(t)
  }, [activeEstablishmentId, loadAll])

  const hourlyRows: HourlyChartRow[] = useMemo(() => {
    if (!data?.todayInsights) return []
    const n = new Date()
    return buildHourlyChartRows(
      data.todayInsights.buckets,
      data.yesterdayHourly?.buckets ?? [],
      n,
      spYesterdayInstantForCalendarMatcher(n),
    )
  }, [data?.todayInsights, data?.yesterdayHourly])

  const todayTotals = data?.todayInsights?.totals ?? normalizeTotals(undefined)
  const live = data?.todayInsights?.live
  const mood = liveMoodCopy(live)
  const yesterdayCount = data?.yesterdayInsights?.totals.count ?? 0
  const feedbackDelta = formatDelta(todayTotals.count, yesterdayCount)

  const activeEmployees = data?.employees.filter((e) => e.active).length ?? 0
  const totalEmployees = data?.employees.length ?? 0
  const upcomingEventsCount = data?.events.length ?? 0
  const totalRegistrations = data?.events.reduce((sum, e) => sum + (data.eventRegistrations.get(e.id) ?? 0), 0) ?? 0
  const menuItemsCount = data?.menu?.items.length ?? 0
  const activeQuotesCount = data?.activeQuotes.length ?? 0
  const activeOrdersCount = (data?.pendingOrdersCount ?? 0) + (data?.inProgressOrdersCount ?? 0)
  const score = data?.establishment?.score ?? 0

  if (establishmentOptions.length === 0) {
    return (
      <div className="ov-page">
        <div className="ov-inner">
          <p className="ov-empty">
            Não tens estabelecimentos associados a esta conta. Contacta o suporte VibeNow.
          </p>
          <button type="button" className="ov-btn-ghost" onClick={logout}>Sair</button>
        </div>
      </div>
    )
  }

  if (activeEstablishmentId == null) {
    return (
      <div className="ov-page">
        <div className="ov-inner ov-empty">
          <p>Escolhe um estabelecimento para ver o painel.</p>
          <select
            className="ov-select"
            value=""
            onChange={(ev) => { const v = Number(ev.target.value); if (v) selectEstablishment(v) }}
          >
            <option value="">—</option>
            {establishmentOptions.map(([eid, name]) => (
              <option key={eid} value={eid}>{name}</option>
            ))}
          </select>
        </div>
      </div>
    )
  }

  const todayLabel = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date())

  console.log('feedbacks', data?.recentFeedbacks)
  console.log('data', data)

  return (
    <div className="ov-page">
      <div className="ov-inner">
        {/* Header */}
        <header className="ov-header">
          <div className="ov-header__left">
            <p className="ov-header__eyebrow">Visão geral</p>
            <h1 className="ov-header__title">
              Olá, {user?.name?.split(' ')[0]}
            </h1>
            <p className="ov-header__sub">
              {data?.establishment?.name ?? 'Carregando...'} · {todayLabel}
            </p>
          </div>
          <div className="ov-header__right">
            <span className="ov-header__pill">{user?.name}</span>
            <button type="button" className="ov-btn-ghost" onClick={logout}>Sair</button>
          </div>
        </header>

        {error && <p className="ov-error">{error}</p>}
        {loading && !data && <p className="ov-loading">A carregar painel…</p>}

        {data && (
          <>
            {/* KPI Row 1 */}
            <div className="ov-kpi-grid">
              <div className="ov-kpi">
                <div className="ov-kpi__icon ov-kpi__icon--feedback">
                  <MessageSquareText size={20} />
                </div>
                <div className="ov-kpi__body">
                  <p className="ov-kpi__label">Feedbacks hoje</p>
                  <p className="ov-kpi__value">{todayTotals.count}</p>
                  <p className={`ov-kpi__delta ov-kpi__delta--${feedbackDelta.direction}`}>
                    {feedbackDelta.direction === 'up' && <TrendingUp size={14} />}
                    {feedbackDelta.direction === 'down' && <TrendingDown size={14} />}
                    {feedbackDelta.text} vs ontem
                  </p>
                </div>
              </div>

              <div className="ov-kpi">
                <div className="ov-kpi__icon ov-kpi__icon--rating">
                  <Star size={20} />
                </div>
                <div className="ov-kpi__body">
                  <p className="ov-kpi__label">Média hoje</p>
                  <p className="ov-kpi__value">{todayTotals.averageRating.toFixed(1)}</p>
                  <p className="ov-kpi__sub">de 5.0</p>
                </div>
              </div>

              <div className="ov-kpi">
                <div className="ov-kpi__icon ov-kpi__icon--orders">
                  <ShoppingBag size={20} />
                </div>
                <div className="ov-kpi__body">
                  <p className="ov-kpi__label">Pedidos ativos</p>
                  <p className="ov-kpi__value">{activeOrdersCount}</p>
                  <p className="ov-kpi__sub">
                    {data.pendingOrdersCount} pendentes · {data.inProgressOrdersCount} em preparo
                  </p>
                </div>
              </div>

              <div className="ov-kpi">
                <div className="ov-kpi__icon ov-kpi__icon--team">
                  <Users size={20} />
                </div>
                <div className="ov-kpi__body">
                  <p className="ov-kpi__label">Funcionários</p>
                  <p className="ov-kpi__value">{activeEmployees}</p>
                  <p className="ov-kpi__sub">{totalEmployees > 0 ? `de ${totalEmployees} total` : 'nenhum cadastrado'}</p>
                </div>
              </div>
            </div>

            {/* KPI Row 2 */}
            <div className="ov-kpi-grid">
              <div className="ov-kpi">
                <div className="ov-kpi__icon ov-kpi__icon--events">
                  <CalendarDays size={20} />
                </div>
                <div className="ov-kpi__body">
                  <p className="ov-kpi__label">Próximos eventos</p>
                  <p className="ov-kpi__value">{upcomingEventsCount}</p>
                  <p className="ov-kpi__sub">
                    {upcomingEventsCount > 0
                      ? `${totalRegistrations} inscrito${totalRegistrations !== 1 ? 's' : ''}`
                      : 'nenhum agendado'}
                  </p>
                </div>
              </div>

              <div className="ov-kpi">
                <div className="ov-kpi__icon ov-kpi__icon--menu">
                  <ChefHat size={20} />
                </div>
                <div className="ov-kpi__body">
                  <p className="ov-kpi__label">Cardápio</p>
                  <p className="ov-kpi__value">{menuItemsCount}</p>
                  <p className="ov-kpi__sub">{menuItemsCount === 1 ? 'item' : 'itens'} ativos</p>
                </div>
              </div>

              <div className="ov-kpi">
                <div className="ov-kpi__icon ov-kpi__icon--quotes">
                  <Megaphone size={20} />
                </div>
                <div className="ov-kpi__body">
                  <p className="ov-kpi__label">Citações ativas</p>
                  <p className="ov-kpi__value">{activeQuotesCount}</p>
                  <p className="ov-kpi__sub">no ecrã do app</p>
                </div>
              </div>

              <div className="ov-kpi">
                <div className="ov-kpi__icon ov-kpi__icon--score">
                  <Activity size={20} />
                </div>
                <div className="ov-kpi__body">
                  <p className="ov-kpi__label">Score geral</p>
                  <p className="ov-kpi__value">{score > 0 ? score.toFixed(1) : '—'}</p>
                  <p className="ov-kpi__sub">avaliação do estabelecimento</p>
                </div>
              </div>
            </div>

            {/* Mood + Sentiment */}
            <div className="ov-split">
              <div className={`ov-mood-card ov-mood-card--${mood.tone}`}>
                <p className="ov-mood-card__eyebrow">Humor da casa · últimos {LIVE_MINUTES} min</p>
                <h2 className="ov-mood-card__title">{mood.title}</h2>
                <p className="ov-mood-card__sub">{mood.sub}</p>
                <div className="ov-mood-card__stats">
                  <div className="ov-mood-stat">
                    <strong>{live?.count ?? 0}</strong>
                    <span>feedbacks</span>
                  </div>
                  <div className="ov-mood-stat">
                    <strong>{live ? live.averageRating.toFixed(1) : '—'}</strong>
                    <span>média</span>
                  </div>
                </div>
              </div>

              <div className="ov-sentiment-card">
                <p className="ov-sentiment-card__eyebrow">Sentimento hoje</p>
                <div className="ov-sentiment-bars">
                  {todayTotals.count > 0 ? (
                    <>
                      <div
                        className="ov-sentiment-bar ov-sentiment-bar--pos"
                        style={{ flex: todayTotals.positive }}
                        title={`Positivos: ${todayTotals.positive}`}
                      >
                        {todayTotals.positive > 0 && <span>{todayTotals.positive}</span>}
                      </div>
                      <div
                        className="ov-sentiment-bar ov-sentiment-bar--neu"
                        style={{ flex: todayTotals.neutral }}
                        title={`Neutros: ${todayTotals.neutral}`}
                      >
                        {todayTotals.neutral > 0 && <span>{todayTotals.neutral}</span>}
                      </div>
                      <div
                        className="ov-sentiment-bar ov-sentiment-bar--neg"
                        style={{ flex: todayTotals.negative }}
                        title={`Negativos: ${todayTotals.negative}`}
                      >
                        {todayTotals.negative > 0 && <span>{todayTotals.negative}</span>}
                      </div>
                    </>
                  ) : (
                    <div className="ov-sentiment-bar ov-sentiment-bar--empty">
                      <span>Sem dados</span>
                    </div>
                  )}
                </div>
                <div className="ov-sentiment-legend">
                  <span className="ov-sentiment-legend__item ov-sentiment-legend__item--pos">Positivos</span>
                  <span className="ov-sentiment-legend__item ov-sentiment-legend__item--neu">Neutros</span>
                  <span className="ov-sentiment-legend__item ov-sentiment-legend__item--neg">Negativos</span>
                </div>
              </div>
            </div>

            {/* Chart */}
            <section className="ov-card">
              <div className="ov-card__head">
                <div>
                  <h2 className="ov-card__title">Volume de feedbacks por hora</h2>
                  <p className="ov-card__desc">Hoje vs ontem no fuso de São Paulo</p>
                </div>
              </div>
              {hourlyRows.some((r) => r.hoje > 0 || r.ontem > 0) ? (
                <HourlyVolumeChart data={hourlyRows} />
              ) : (
                <p className="ov-card__empty">Sem feedbacks registrados hoje ou ontem para exibir o gráfico.</p>
              )}
            </section>

            {/* Recent activity */}
            <div className="ov-split">
              {/* Recent feedbacks */}
              <section className="ov-card">
                <div className="ov-card__head">
                  <h2 className="ov-card__title">Feedbacks recentes</h2>
                  <Link to="/feedbacks" className="ov-card__link">Ver todos</Link>
                </div>
                {data.recentFeedbacks.length === 0 ? (
                  <p className="ov-card__empty">Nenhum feedback ainda.</p>
                ) : (
                  <ul className="ov-recent-list">
                    {data.recentFeedbacks.map((fb) => {
                      const filled = Math.round(fb.rating)
                      return (
                        <li key={fb.id} className="ov-recent-item">
                          <div className="ov-recent-item__left">
                            <span
                              className="ov-recent-item__dot"
                              style={{ background: sentimentColor(fb.sentiment) }}
                              title={sentimentLabel(fb.sentiment)}
                            />
                            <div>
                              <p className="ov-recent-item__primary">
                                {'★'.repeat(filled)}{'☆'.repeat(5 - filled)}
                                <span className="ov-recent-item__rating">{fb.rating.toFixed(1)}</span>
                              </p>
                              <p className="ov-recent-item__secondary">
                                {fb.comment ? (fb.comment.length > 60 ? fb.comment.slice(0, 60) + '…' : fb.comment) : 'Sem comentário'}
                              </p>
                            </div>
                          </div>
                          <span className="ov-recent-item__time">{timeAgo(fb.createdAt)}</span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>

              {/* Recent orders */}
              <section className="ov-card">
                <div className="ov-card__head">
                  <h2 className="ov-card__title">Pedidos recentes</h2>
                  <Link to="/pedidos" className="ov-card__link">Ver todos</Link>
                </div>
                {data.recentOrders.length === 0 ? (
                  <p className="ov-card__empty">Nenhum pedido ainda.</p>
                ) : (
                  <ul className="ov-recent-list">
                    {data.recentOrders.map((order) => (
                      <li key={order.id} className="ov-recent-item">
                        <div className="ov-recent-item__left">
                          <span className={`ov-badge ${orderStatusCls(order.status)}`}>
                            {orderStatusLabel(order.status)}
                          </span>
                          <div>
                            <p className="ov-recent-item__primary">
                              Pedido #{order.id}
                            </p>
                            <p className="ov-recent-item__secondary">
                              {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                              {order.user?.name ? ` · ${order.user.name}` : ''}
                            </p>
                          </div>
                        </div>
                        <span className="ov-recent-item__time">{timeAgo(order.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {/* Upcoming events */}
            {data.events.length > 0 && (
              <section className="ov-card">
                <div className="ov-card__head">
                  <h2 className="ov-card__title">Próximos eventos</h2>
                  <Link to="/eventos" className="ov-card__link">Ver todos</Link>
                </div>
                <div className="ov-events-strip">
                  {data.events.slice(0, 5).map((ev) => (
                    <div key={ev.id} className="ov-event-chip">
                      <div className="ov-event-chip__date">
                        {formatSpDateLabel(ev.eventStartsAt)}
                      </div>
                      <p className="ov-event-chip__name">{ev.name}</p>
                      <p className="ov-event-chip__meta">
                        {data.eventRegistrations.get(ev.id) ?? 0} inscritos
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
