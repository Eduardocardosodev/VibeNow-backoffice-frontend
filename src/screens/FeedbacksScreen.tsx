import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Star } from 'lucide-react'
import { useAuth } from '@/contexts'
import { FeedbackMoodStrip, type MoodCounts } from '@/components/feedbacks/FeedbackMoodStrip'
import { FeedbackPhotoLightbox } from '@/components/feedbacks/FeedbackPhotoLightbox'
import { ApiError } from '@/lib/apiClient'
import { formatSpDateTimeLabel, spTodayToNowRange, utcLastHourToNowRange } from '@/lib/datetimeSp'
import { fetchEstablishmentFeedbacks } from '@/services/establishmentFeedbacks'
import type {
  EstablishmentFeedbackItem,
  EstablishmentFeedbacksPage,
  FeedbackSentiment,
} from '@/types/establishmentFeedback'
import {
  FEEDBACK_TOPIC_KEYS,
  FEEDBACK_TOPIC_LABELS,
} from '@/types/establishmentFeedback'
import '@/styles/feedbacks.css'

type Preset = 'hour' | 'today' | 'history'

const SENTIMENT_LABEL: Record<FeedbackSentiment, string> = {
  positive: 'Positivo',
  neutral: 'Neutro',
  negative: 'Negativo',
}

const POLL_MS = 60_000

function emptyPage(): EstablishmentFeedbacksPage {
  return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }
}

function countsFromItems(items: EstablishmentFeedbackItem[]): MoodCounts {
  let positive = 0
  let neutral = 0
  let negative = 0
  for (const it of items) {
    if (it.sentiment === 'positive') positive++
    else if (it.sentiment === 'neutral') neutral++
    else negative++
  }
  return { positive, neutral, negative }
}

function RatingStars({ rating }: { rating: number }) {
  const r = Math.min(5, Math.max(0, Math.round(rating)))
  return (
    <span className="fb-card__stars" aria-label={`Nota ${rating.toFixed(1)} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={16}
          fill={i <= r ? 'currentColor' : 'transparent'}
          strokeWidth={2}
          aria-hidden
        />
      ))}
      <span className="fb-card__rating-value">{rating.toFixed(1)}</span>
    </span>
  )
}

function TopicBars({ item }: { item: EstablishmentFeedbackItem }) {
  return (
    <div className="fb-card__topics">
      {FEEDBACK_TOPIC_KEYS.map((key) => {
        const value = item[key]
        return (
          <div key={key} className="fb-topic">
            <span className="fb-topic__label">{FEEDBACK_TOPIC_LABELS[key]}</span>
            <div className="fb-topic__track">
              <div
                className="fb-topic__fill"
                style={{ width: `${(value / 5) * 100}%` }}
              />
            </div>
            <span className="fb-topic__value">{value}</span>
          </div>
        )
      })}
    </div>
  )
}

export function FeedbacksScreen() {
  const { access, activeEstablishmentId, selectEstablishment } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const establishmentOptions = useMemo(() => {
    const m = new Map<number, string>()
    access?.ownedEstablishments.forEach((e) => m.set(e.id, e.name))
    access?.employments.forEach((e) => m.set(e.establishmentId, e.establishmentName))
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1], 'pt'))
  }, [access])

  const urlPeriod = useMemo(() => {
    const from = searchParams.get('from')?.trim() ?? ''
    const to = searchParams.get('to')?.trim() ?? ''
    if (!from || !to) return null
    const df = new Date(from)
    const dt = new Date(to)
    if (Number.isNaN(df.getTime()) || Number.isNaN(dt.getTime()) || df.getTime() > dt.getTime()) {
      return null
    }
    return { from, to }
  }, [searchParams])

  const urlEstablishmentId = useMemo(() => {
    const raw = searchParams.get('establishmentId')?.trim() ?? ''
    if (!raw) return null
    const n = Number(raw)
    if (!Number.isFinite(n) || n <= 0) return null
    return n
  }, [searchParams])

  const feedbackEstablishmentId = useMemo(() => {
    if (
      urlPeriod &&
      urlEstablishmentId != null &&
      establishmentOptions.some(([id]) => id === urlEstablishmentId)
    ) {
      return urlEstablishmentId
    }
    return activeEstablishmentId
  }, [urlPeriod, urlEstablishmentId, establishmentOptions, activeEstablishmentId])

  const periodKey = urlPeriod ? `${urlPeriod.from}|${urlPeriod.to}|${urlEstablishmentId ?? ''}` : ''

  const [preset, setPreset] = useState<Preset>('today')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sort, setSort] = useState<'desc' | 'asc'>('desc')
  const [minRating, setMinRating] = useState<string>('')
  const [maxRating, setMaxRating] = useState<string>('')
  const [photoFilter, setPhotoFilter] = useState<'all' | 'with' | 'without'>('all')
  const [historyFrom, setHistoryFrom] = useState('')
  const [historyTo, setHistoryTo] = useState('')

  const [data, setData] = useState<EstablishmentFeedbacksPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  useEffect(() => {
    if (activeEstablishmentId == null && establishmentOptions.length === 1) {
      selectEstablishment(establishmentOptions[0][0])
    }
  }, [activeEstablishmentId, establishmentOptions, selectEstablishment])

  useEffect(() => {
    if (urlPeriod) setPreset('history')
  }, [urlPeriod])

  useLayoutEffect(() => {
    if (urlPeriod == null || urlEstablishmentId == null) return
    if (!establishmentOptions.some(([id]) => id === urlEstablishmentId)) return
    if (activeEstablishmentId !== urlEstablishmentId) {
      selectEstablishment(urlEstablishmentId)
    }
  }, [
    urlPeriod,
    urlEstablishmentId,
    establishmentOptions,
    activeEstablishmentId,
    selectEstablishment,
  ])

  const ratingFilterError = useMemo(() => {
    const min = minRating === '' ? null : Number(minRating)
    const max = maxRating === '' ? null : Number(maxRating)
    if (min != null && max != null && min > max) {
      return 'A nota mínima não pode ser maior que a máxima.'
    }
    return null
  }, [minRating, maxRating])

  const historyDateError = useMemo(() => {
    if (preset !== 'history') return null
    if (!historyFrom.trim() || !historyTo.trim()) return null
    const a = new Date(historyFrom).getTime()
    const b = new Date(historyTo).getTime()
    if (Number.isNaN(a) || Number.isNaN(b)) return null
    if (a > b) return 'O horário inicial deve ser anterior ao final.'
    return null
  }, [preset, historyFrom, historyTo])

  const queryBlocked = Boolean(ratingFilterError || (!urlPeriod && historyDateError))

  const apiQuery = useMemo(() => {
    const q: Parameters<typeof fetchEstablishmentFeedbacks>[1] = {
      page,
      pageSize,
      sort,
    }

    const min = minRating === '' ? undefined : Number(minRating)
    const max = maxRating === '' ? undefined : Number(maxRating)
    if (min != null && !Number.isNaN(min)) q.minRating = min
    if (max != null && !Number.isNaN(max)) q.maxRating = max
    if (photoFilter === 'with') q.hasPhoto = true
    if (photoFilter === 'without') q.hasPhoto = false

    const now = new Date()
    if (urlPeriod) {
      q.from = urlPeriod.from
      q.to = urlPeriod.to
    } else if (preset === 'hour') {
      const r = utcLastHourToNowRange(now)
      q.from = r.from
      q.to = r.to
    } else if (preset === 'today') {
      const r = spTodayToNowRange(now)
      q.from = r.from
      q.to = r.to
    } else {
      if (historyFrom.trim()) {
        const d = new Date(historyFrom)
        if (!Number.isNaN(d.getTime())) q.from = d.toISOString()
      }
      if (historyTo.trim()) {
        const d = new Date(historyTo)
        if (!Number.isNaN(d.getTime())) q.to = d.toISOString()
      }
    }

    return q
  }, [urlPeriod, preset, page, pageSize, sort, minRating, maxRating, photoFilter, historyFrom, historyTo])

  const load = useCallback(async () => {
    if (feedbackEstablishmentId == null) {
      setLoading(false)
      setData(null)
      return
    }
    if (queryBlocked) {
      setLoading(false)
      setError(null)
      setData(emptyPage())
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetchEstablishmentFeedbacks(feedbackEstablishmentId, apiQuery)
      setData(res)
      setLastRefresh(new Date())
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Erro ao carregar feedbacks'
      setError(msg)
      setData(emptyPage())
    } finally {
      setLoading(false)
    }
  }, [feedbackEstablishmentId, apiQuery, queryBlocked])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (feedbackEstablishmentId == null || queryBlocked) return
    if (preset !== 'hour' && preset !== 'today') return
    const t = window.setInterval(() => void load(), POLL_MS)
    return () => window.clearInterval(t)
  }, [feedbackEstablishmentId, preset, load, queryBlocked])

  useEffect(() => {
    setPage(1)
  }, [preset, pageSize, sort, minRating, maxRating, photoFilter, historyFrom, historyTo, periodKey])

  const moodCounts = useMemo(() => countsFromItems(data?.items ?? []), [data])

  const moodCaption = useMemo(() => {
    const parts: string[] = []
    parts.push(
      `Humor na página atual (${data?.items.length ?? 0} de ${data?.total ?? 0} no filtro).`,
    )
    if (lastRefresh) {
      parts.push(
        `Última atualização: ${new Intl.DateTimeFormat('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(lastRefresh)}.`,
      )
    }
    if (preset === 'hour' || preset === 'today') {
      parts.push('Atualização automática a cada minuto.')
    }
    return parts.join(' ')
  }, [data, lastRefresh, preset])

  const canPrev = (data?.page ?? 1) > 1
  const canNext = data != null && data.page < data.totalPages

  if (activeEstablishmentId == null && feedbackEstablishmentId == null) {
    return (
      <div className="feedbacks">
        <div className="feedbacks__inner">
          <header className="feedbacks__header">
            <div>
              <p className="feedbacks__eyebrow">Operação</p>
              <h1 className="feedbacks__title">Feedbacks</h1>
              <p className="feedbacks__sub">
                Selecione um estabelecimento para ver comentários, notas e fotos dos clientes.
              </p>
            </div>
          </header>
          <p className="feedbacks__empty">Nenhum estabelecimento disponível nesta conta.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="feedbacks">
      <div className="feedbacks__inner">
        <header className="feedbacks__header">
          <div>
            <p className="feedbacks__eyebrow">Operação &amp; reputação</p>
            <h1 className="feedbacks__title">Gestão de feedbacks</h1>
            <p className="feedbacks__sub">
              Lista paginada com filtros por nota e horário, fotos dos clientes e distribuição de humor
              na amostra carregada.
            </p>
          </div>
          {establishmentOptions.length > 1 ? (
            <div className="feedbacks__header-actions">
              <label className="visually-hidden" htmlFor="fb-establishment">
                Estabelecimento
              </label>
              <select
                id="fb-establishment"
                className="feedbacks__select"
                value={activeEstablishmentId ?? ''}
                onChange={(e) => selectEstablishment(Number(e.target.value))}
              >
                {establishmentOptions.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </header>

        <div className="feedbacks__presets" role="tablist" aria-label="Período">
          <button
            type="button"
            role="tab"
            aria-selected={preset === 'hour'}
            className={`feedbacks__preset${preset === 'hour' ? ' feedbacks__preset--active' : ''}`}
            onClick={() => {
              setSearchParams({}, { replace: true })
              setPreset('hour')
            }}
          >
            Última hora
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={preset === 'today'}
            className={`feedbacks__preset${preset === 'today' ? ' feedbacks__preset--active' : ''}`}
            onClick={() => {
              setSearchParams({}, { replace: true })
              setPreset('today')
            }}
          >
            Hoje
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={preset === 'history'}
            className={`feedbacks__preset${preset === 'history' ? ' feedbacks__preset--active' : ''}`}
            onClick={() => {
              setSearchParams({}, { replace: true })
              setPreset('history')
            }}
          >
            Histórico
          </button>
        </div>

        {urlPeriod ? (
          <div className="feedbacks__period-banner" role="status">
            <p className="feedbacks__period-banner__text">
              A mostrar feedbacks entre{' '}
              <strong>{formatSpDateTimeLabel(urlPeriod.from)}</strong> e{' '}
              <strong>{formatSpDateTimeLabel(urlPeriod.to)}</strong> (horário de São Paulo), conforme o
              período escolhido no histórico de pontuação.
            </p>
            <button
              type="button"
              className="feedbacks__period-banner__btn"
              onClick={() => {
                setSearchParams({}, { replace: true })
                setPreset('today')
              }}
            >
              Limpar filtro de período
            </button>
          </div>
        ) : null}

        <div className="feedbacks__meta">
          {preset === 'hour' || preset === 'today' ? (
            <span className="feedbacks__live">
              <span className="feedbacks__live-dot" aria-hidden />
              Vista em tempo quase real
            </span>
          ) : null}
          <span>
            Total no filtro: <strong>{data?.total ?? '—'}</strong>
          </span>
        </div>

        <div className={`feedbacks__filters${preset === 'history' ? ' feedbacks__filters--wide' : ''}`}>
          <div className="feedbacks__field">
            <label htmlFor="fb-min-rating">Nota mín.</label>
            <select
              id="fb-min-rating"
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
            >
              <option value="">Todas</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="feedbacks__field">
            <label htmlFor="fb-max-rating">Nota máx.</label>
            <select
              id="fb-max-rating"
              value={maxRating}
              onChange={(e) => setMaxRating(e.target.value)}
            >
              <option value="">Todas</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="feedbacks__field">
            <label htmlFor="fb-photo">Fotos</label>
            <select
              id="fb-photo"
              value={photoFilter}
              onChange={(e) => setPhotoFilter(e.target.value as typeof photoFilter)}
            >
              <option value="all">Todas</option>
              <option value="with">Com foto</option>
              <option value="without">Sem foto</option>
            </select>
          </div>
          <div className="feedbacks__field">
            <label htmlFor="fb-sort">Ordem</label>
            <select
              id="fb-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as 'desc' | 'asc')}
            >
              <option value="desc">Mais recentes</option>
              <option value="asc">Mais antigos</option>
            </select>
          </div>
          <div className="feedbacks__field">
            <label htmlFor="fb-page-size">Por página</label>
            <select
              id="fb-page-size"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          {preset === 'history' ? (
            <>
              <div className="feedbacks__field">
                <label htmlFor="fb-from">De (horário)</label>
                <input
                  id="fb-from"
                  type="datetime-local"
                  value={historyFrom}
                  onChange={(e) => setHistoryFrom(e.target.value)}
                />
              </div>
              <div className="feedbacks__field">
                <label htmlFor="fb-to">Até (horário)</label>
                <input
                  id="fb-to"
                  type="datetime-local"
                  value={historyTo}
                  onChange={(e) => setHistoryTo(e.target.value)}
                />
              </div>
            </>
          ) : null}
          {ratingFilterError ? <p className="feedbacks__filter-error">{ratingFilterError}</p> : null}
          {historyDateError ? <p className="feedbacks__filter-error">{historyDateError}</p> : null}
        </div>

        {!queryBlocked && !loading && data && data.total > 0 ? (
          <FeedbackMoodStrip counts={moodCounts} caption={moodCaption} />
        ) : null}

        {loading ? <p className="feedbacks__loading">A carregar…</p> : null}
        {error ? <p className="feedbacks__error">{error}</p> : null}

        {!loading && !error && !queryBlocked && data && data.items.length === 0 ? (
          <p className="feedbacks__empty">Nenhum feedback com estes filtros.</p>
        ) : null}

        {!loading && data && data.items.length > 0 ? (
          <ul className="feedbacks__list">
            {data.items.map((item) => (
              <li key={item.id}>
                <article className="fb-card">
                  <div className="fb-card__thumb-wrap">
                    {item.photoUrl ? (
                      <button
                        type="button"
                        className="fb-card__thumb-btn"
                        onClick={() => setLightboxUrl(item.photoUrl)}
                        aria-label="Ampliar foto"
                      >
                        <img
                          className="fb-card__thumb"
                          src={item.photoUrl}
                          alt=""
                          loading="lazy"
                        />
                      </button>
                    ) : (
                      <div className="fb-card__thumb-placeholder">Sem foto</div>
                    )}
                  </div>
                  <div className="fb-card__top">
                    <RatingStars rating={item.rating} />
                    <span className="fb-card__time">{formatSpDateTimeLabel(item.createdAt)}</span>
                    <span
                      className={`fb-card__sentiment fb-card__sentiment--${item.sentiment}`}
                    >
                      {SENTIMENT_LABEL[item.sentiment]}
                    </span>
                  </div>
                  <span className="fb-card__id">#{item.id}</span>
                  <TopicBars item={item} />
                  {item.comment?.trim() ? (
                    <p className="fb-card__comment">{item.comment}</p>
                  ) : (
                    <p className="fb-card__comment fb-card__comment--empty">Sem comentário</p>
                  )}
                </article>
              </li>
            ))}
          </ul>
        ) : null}

        {!loading && data && data.totalPages > 1 ? (
          <div className="feedbacks__pager">
            <p className="feedbacks__pager-info">
              Página {data.page} de {data.totalPages}
            </p>
            <div className="feedbacks__pager-actions">
              <button
                type="button"
                className="feedbacks__btn"
                disabled={!canPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <button
                type="button"
                className="feedbacks__btn"
                disabled={!canNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Seguinte
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {lightboxUrl ? (
        <FeedbackPhotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      ) : null}
    </div>
  )
}
