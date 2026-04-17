import { useCallback, useEffect, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts'
import { QuotePreviewDevice } from '@/components/quotes/AppQuotePreview'
import { ApiError } from '@/lib/apiClient'
import { formatSpDateTimeLabel } from '@/lib/datetimeSp'
import {
  createQuote,
  deleteQuote,
  fetchActiveQuotesByEstablishment,
  fetchQuotesByEstablishment,
} from '@/services/quotesApi'
import type { Quote } from '@/types/quote'
import { quoteLifecycleStatus } from '@/types/quote'
import '@/styles/quotes.css'

const MAX_CHARS = 80

export function QuotesScreen() {
  const { access, activeEstablishmentId, selectEstablishment } = useAuth()

  const [draft, setDraft] = useState('')
  const [history, setHistory] = useState<Quote[]>([])
  const [active, setActive] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [nowTick, setNowTick] = useState(() => Date.now())

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

  const load = useCallback(async () => {
    if (activeEstablishmentId == null) {
      setLoading(false)
      setHistory([])
      setActive([])
      return
    }
    setError(null)
    setLoading(true)
    try {
      const [all, act] = await Promise.all([
        fetchQuotesByEstablishment(activeEstablishmentId),
        fetchActiveQuotesByEstablishment(activeEstablishmentId),
      ])
      setHistory(all)
      setActive(act)
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Erro ao carregar citações'
      setError(msg)
      setHistory([])
      setActive([])
    } finally {
      setLoading(false)
    }
  }, [activeEstablishmentId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const t = window.setInterval(() => setNowTick(Date.now()), 60_000)
    return () => window.clearInterval(t)
  }, [])

  const now = useMemo(() => new Date(nowTick), [nowTick])

  const trimmedDraft = draft.slice(0, MAX_CHARS)
  const remaining = MAX_CHARS - trimmedDraft.length
  const counterClass =
    remaining < 0 ? 'quotes-form__counter quotes-form__counter--err' : remaining <= 15 ? 'quotes-form__counter quotes-form__counter--warn' : 'quotes-form__counter'

  const canSubmit =
    activeEstablishmentId != null &&
    trimmedDraft.trim().length > 0 &&
    trimmedDraft.length <= MAX_CHARS &&
    !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || activeEstablishmentId == null) return
    setSubmitting(true)
    setError(null)
    try {
      await createQuote(activeEstablishmentId, trimmedDraft.trim())
      setDraft('')
      await load()
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Não foi possível publicar'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteQuote(q: Quote) {
    if (!window.confirm('Deseja apagar esta citação?')) return
    setDeletingId(q.id)
    setError(null)
    try {
      await deleteQuote(q.id)
      await load()
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Erro ao apagar'
      setError(msg)
    } finally {
      setDeletingId(null)
    }
  }

  if (activeEstablishmentId == null) {
    return (
      <div className="quotes-page">
        <div className="quotes-page__inner">
          <header className="quotes-page__header">
            <div>
              <p className="quotes-page__eyebrow">Comunicação</p>
              <h1 className="quotes-page__title">Citações</h1>
              <p className="quotes-page__sub">Selecione um estabelecimento para gerir frases rápidas.</p>
            </div>
          </header>
          <p className="quotes-page__empty">Nenhum estabelecimento disponível nesta conta.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="quotes-page">
      <div className="quotes-page__inner">
        <header className="quotes-page__header">
          <div>
            <p className="quotes-page__eyebrow">Comunicação</p>
            <h1 className="quotes-page__title">Gestão de citações</h1>
            <p className="quotes-page__sub">
              Publique avisos do dia (até {MAX_CHARS} caracteres), consulte o histórico e veja o preview
              como no app. Ativo ou expirado é calculado pela data de expiração devolvida pela API.
            </p>
          </div>
          {establishmentOptions.length > 1 ? (
            <>
              <label className="visually-hidden" htmlFor="quotes-establishment">
                Estabelecimento
              </label>
              <select
                id="quotes-establishment"
                className="quotes-page__select"
                value={activeEstablishmentId}
                onChange={(e) => selectEstablishment(Number(e.target.value))}
              >
                {establishmentOptions.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </>
          ) : null}
        </header>

        {error ? <div className="quotes-page__error">{error}</div> : null}
        {loading ? <p className="quotes-page__loading">A carregar…</p> : null}

        <div className="quotes-page__grid">
          <div>
            <form className="quotes-form" onSubmit={handleSubmit}>
              <label className="quotes-form__label" htmlFor="quote-text">
                Nova frase
              </label>
              <textarea
                id="quote-text"
                className="quotes-form__textarea"
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, MAX_CHARS))}
                maxLength={MAX_CHARS}
                placeholder="Ex.: Hoje tem DJ às 23h"
                rows={3}
                disabled={submitting}
              />
              <div className="quotes-form__footer">
                <span className={counterClass} aria-live="polite">
                  {trimmedDraft.length}/{MAX_CHARS}
                </span>
                <button type="submit" className="quotes-form__submit" disabled={!canSubmit}>
                  {submitting ? 'A publicar…' : 'Publicar'}
                </button>
              </div>
            </form>

            <section aria-labelledby="quotes-history-heading">
              <h2 id="quotes-history-heading" className="quotes-section__title">
                Histórico
              </h2>
              {history.length === 0 && !loading ? (
                <p className="quotes-page__empty">Ainda não há citações. Publique a primeira acima.</p>
              ) : null}
              {history.length > 0 ? (
                <div className="quotes-table-wrap">
                  <table className="quotes-table">
                    <thead>
                      <tr>
                        <th scope="col">Frase</th>
                        <th scope="col">Criada</th>
                        <th scope="col">Expira</th>
                        <th scope="col">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((q) => {
                        const st = quoteLifecycleStatus(q, now)
                        return (
                          <tr key={q.id}>
                            <td className="quotes-table__text">{q.text}</td>
                            <td className="quotes-table__muted">{formatSpDateTimeLabel(q.createdAt)}</td>
                            <td className="quotes-table__muted">{formatSpDateTimeLabel(q.expiresAt)}</td>
                            <td>
                              <div className="quotes-table__state-row">
                                <span
                                  className={
                                    st === 'active'
                                      ? 'quotes-badge quotes-badge--active'
                                      : 'quotes-badge quotes-badge--expired'
                                  }
                                >
                                  {st === 'active' ? 'Ativo' : 'Expirado'}
                                </span>
                                <button
                                  type="button"
                                  className="quotes-table__delete"
                                  title="Apagar citação"
                                  aria-label={`Apagar citação ${q.id}`}
                                  disabled={deletingId === q.id || submitting}
                                  onClick={() => void handleDeleteQuote(q)}
                                >
                                  <Trash2 size={18} strokeWidth={2} aria-hidden />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          </div>

          <aside className="quotes-preview-panel" aria-label="Pré-visualização">
            <p className="quotes-preview-panel__title">Preview no app</p>
            <QuotePreviewDevice activeQuotes={active} draftText={trimmedDraft} />
          </aside>
        </div>
      </div>
    </div>
  )
}
