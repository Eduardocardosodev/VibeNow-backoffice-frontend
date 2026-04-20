import { useCallback, useEffect, useMemo, useState } from 'react'
import { createSearchParams, Link, useNavigate } from 'react-router-dom'
import { History } from 'lucide-react'
import { useAuth } from '@/contexts'
import { ApiError } from '@/lib/apiClient'
import {
  formatInstantInOperatingTz,
  formatOperationalPeriodLabel,
  resolveOperatingTimeZone,
} from '@/lib/formatScorePeriodRange'
import { fetchEstablishment } from '@/services/establishmentApi'
import { fetchScorePeriods } from '@/services/scorePeriodsApi'
import type { Establishment } from '@/types/establishment'
import type { ScorePeriodsPage } from '@/types/scorePeriods'
import '@/styles/scorePeriods.css'

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const

/** Query para /feedbacks: mesmo contrato que GET /feedbacks/establishment/:id?from=&to= (ISO 8601). */
function feedbacksSearchForPeriod(fromUtc: string, toUtc: string, establishmentId: number): string {
  return createSearchParams({
    from: fromUtc,
    to: toUtc,
    establishmentId: String(establishmentId),
  }).toString()
}

export function ScorePeriodsScreen() {
  const { access, activeEstablishmentId, selectEstablishment } = useAuth()
  const navigate = useNavigate()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [establishment, setEstablishment] = useState<Establishment | null>(null)
  const [data, setData] = useState<ScorePeriodsPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const establishmentOptions = useMemo(() => {
    const m = new Map<number, string>()
    access?.ownedEstablishments.forEach((e) => m.set(e.id, e.name))
    access?.employments.forEach((e) => m.set(e.establishmentId, e.establishmentName))
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1], 'pt'))
  }, [access])

  const timeZone = useMemo(
    () => resolveOperatingTimeZone(establishment),
    [establishment],
  )

  useEffect(() => {
    if (activeEstablishmentId == null && establishmentOptions.length === 1) {
      selectEstablishment(establishmentOptions[0][0])
    }
  }, [activeEstablishmentId, establishmentOptions, selectEstablishment])

  const load = useCallback(async () => {
    if (activeEstablishmentId == null) {
      setLoading(false)
      setData(null)
      setEstablishment(null)
      return
    }
    setError(null)
    setLoading(true)
    const id = activeEstablishmentId
    try {
      const [est, periods] = await Promise.all([
        fetchEstablishment(id),
        fetchScorePeriods(id, { page, pageSize }),
      ])
      setEstablishment(est)
      setData(periods)
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Erro ao carregar histórico'
      setError(msg)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [activeEstablishmentId, page, pageSize])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [activeEstablishmentId, pageSize])

  const canPrev = (data?.page ?? 1) > 1
  const canNext = data != null && data.page < data.totalPages

  if (establishmentOptions.length === 0) {
    return (
      <div className="scp-page">
        <div className="scp-inner">
          <p className="scp-empty">Não tens estabelecimentos associados a esta conta.</p>
        </div>
      </div>
    )
  }

  if (activeEstablishmentId == null) {
    return (
      <div className="scp-page">
        <div className="scp-inner">
          <header className="scp-header">
            <p className="scp-eyebrow">Histórico</p>
            <h1 className="scp-title">Pontuação por turno</h1>
            <p className="scp-sub">Escolhe um estabelecimento para ver as médias por período operacional.</p>
          </header>
          <select
            className="scp-select"
            value=""
            onChange={(ev) => {
              const v = Number(ev.target.value)
              if (v) selectEstablishment(v)
            }}
          >
            <option value="">— Estabelecimento —</option>
            {establishmentOptions.map(([eid, name]) => (
              <option key={eid} value={eid}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>
    )
  }

  return (
    <div className="scp-page">
      <div className="scp-inner">
        <header className="scp-header">
          <div className="scp-header__row">
            <div>
              <p className="scp-eyebrow">Reputação agregada</p>
              <h1 className="scp-title">Histórico de pontuação por turno</h1>
              <p className="scp-sub">
                Média e volume de feedbacks por cada período operacional já encerrado (conforme o teu
                horário no estabelecimento). Para comentários e tópicos, usa a lista de{' '}
                <Link to="/feedbacks" className="scp-link">
                  Feedbacks
                </Link>
                .
              </p>
            </div>
            {establishmentOptions.length > 1 ? (
              <div>
                <label className="visually-hidden" htmlFor="scp-est">
                  Estabelecimento
                </label>
                <select
                  id="scp-est"
                  className="scp-select"
                  value={activeEstablishmentId}
                  onChange={(ev) => selectEstablishment(Number(ev.target.value))}
                >
                  {establishmentOptions.map(([eid, name]) => (
                    <option key={eid} value={eid}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        </header>

        {error ? <p className="scp-error">{error}</p> : null}
        {loading ? <p className="scp-loading">A carregar histórico…</p> : null}

        {!loading && !error && data && (
          <>
            {data.currentSession ? (
              <section
                className="scp-current scp-current--clickable"
                tabIndex={0}
                role="button"
                title="Ver feedbacks desta sessão"
                aria-label="Ver feedbacks desta sessão operacional"
                onClick={() => {
                  const s = data.currentSession
                  if (!s) return
                  navigate({
                    pathname: '/feedbacks',
                    search: feedbacksSearchForPeriod(
                      s.periodStartUtc,
                      s.periodEndUtc,
                      activeEstablishmentId,
                    ),
                  })
                }}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return
                  e.preventDefault()
                  const s = data.currentSession
                  if (!s) return
                  navigate({
                    pathname: '/feedbacks',
                    search: feedbacksSearchForPeriod(
                      s.periodStartUtc,
                      s.periodEndUtc,
                      activeEstablishmentId,
                    ),
                  })
                }}
              >
                <p className="scp-current__label">Sessão actual</p>
                <h2 id="scp-current-heading" className="scp-current__title">
                  {establishment?.name ?? 'Estabelecimento'}
                </h2>
                <p className="scp-current__range">
                  {formatOperationalPeriodLabel(
                    data.currentSession.periodStartUtc,
                    data.currentSession.periodEndUtc,
                    timeZone,
                  )}
                </p>
                <div className="scp-current__stats">
                  <div className="scp-stat">
                    <strong>{data.currentSession.averageRating.toFixed(1)}</strong>
                    <span>Média até agora</span>
                  </div>
                  <div className="scp-stat">
                    <strong>{data.currentSession.feedbackCount}</strong>
                    <span>Feedbacks</span>
                  </div>
                  <div className="scp-stat">
                    <strong>{data.currentSession.sumRating.toFixed(1)}</strong>
                    <span>Soma das notas</span>
                  </div>
                </div>
                <p className="scp-current__hint">Clica ou prime Enter para ver os feedbacks deste período.</p>
              </section>
            ) : null}

            <div className="scp-toolbar">
              <span>
                <strong>{data.total}</strong> período{data.total === 1 ? '' : 's'} no histórico
                {data.totalPages > 1 ? (
                  <>
                    {' '}
                    · página <strong>{data.page}</strong> de <strong>{data.totalPages}</strong>
                  </>
                ) : null}
              </span>
              <div className="scp-toolbar__right">
                <label htmlFor="scp-page-size">Por página</label>
                <select
                  id="scp-page-size"
                  value={pageSize}
                  onChange={(ev) => setPageSize(Number(ev.target.value))}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="scp-btn"
                  disabled={!canPrev}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="scp-btn"
                  disabled={!canNext}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Seguinte
                </button>
              </div>
            </div>

            {data.items.length === 0 ? (
              <p className="scp-empty">
                Ainda não há períodos fechados no histórico
              </p>
            ) : (
              <div className="scp-table-wrap">
                <table className="scp-table">
                  <thead>
                    <tr>
                      <th scope="col">Período operacional</th>
                      <th scope="col">Média</th>
                      <th scope="col">Feedbacks</th>
                      <th scope="col">Registo fechado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((row) => (
                      <tr
                        key={row.id}
                        className="scp-table__row--clickable"
                        tabIndex={0}
                        role="button"
                        title="Ver feedbacks deste período"
                        aria-label="Ver feedbacks deste período operacional"
                        onClick={() =>
                          navigate({
                            pathname: '/feedbacks',
                            search: feedbacksSearchForPeriod(
                              row.periodStartUtc,
                              row.periodEndUtc,
                              activeEstablishmentId,
                            ),
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter' && e.key !== ' ') return
                          e.preventDefault()
                          navigate({
                            pathname: '/feedbacks',
                            search: feedbacksSearchForPeriod(
                              row.periodStartUtc,
                              row.periodEndUtc,
                              activeEstablishmentId,
                            ),
                          })
                        }}
                      >
                        <td className="scp-table__period">
                          {formatOperationalPeriodLabel(row.periodStartUtc, row.periodEndUtc, timeZone)}
                        </td>
                        <td className="scp-table__avg">{row.averageRating.toFixed(1)}</td>
                        <td className="scp-table__num">{row.feedbackCount}</td>
                        <td className="scp-table__num">
                          {row.closedAt
                            ? formatInstantInOperatingTz(row.closedAt, timeZone)
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="scp-tz-hint">
              <History size={14} aria-hidden />
              Datas no fuso <code>{timeZone}</code>
              {establishment?.operatingTimeZone ? '' : ' (padrão São Paulo — define operatingTimeZone na API se for outro)'}
              .
            </p>
          </>
        )}
      </div>
    </div>
  )
}
