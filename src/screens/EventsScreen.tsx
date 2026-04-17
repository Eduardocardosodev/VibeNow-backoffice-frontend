import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts'
import { EventFormModal } from '@/components/events/EventFormModal'
import { ApiError } from '@/lib/apiClient'
import { formatSpDateTimeLabel } from '@/lib/datetimeSp'
import {
  deleteScheduledEvent,
  fetchEstablishmentScheduledEvents,
  fetchEventRegistrationsCount,
} from '@/services/eventsScheduleApi'
import type { ScheduledEvent } from '@/types/scheduledEvent'
import { eventListTypeLabel } from '@/types/scheduledEvent'
import '@/styles/events.css'

type EventRow = ScheduledEvent & { registrationCount: number | null }

function formatBrl(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function isUpcoming(event: ScheduledEvent): boolean {
  return new Date(event.eventStartsAt).getTime() > Date.now()
}

export function EventsScreen() {
  const { access, activeEstablishmentId, selectEstablishment } = useAuth()

  const [rows, setRows] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ScheduledEvent | null>(null)

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
      setRows([])
      setLoading(false)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const list = await fetchEstablishmentScheduledEvents(activeEstablishmentId)
      const countResults = await Promise.allSettled(
        list.map((e) => fetchEventRegistrationsCount(e.id)),
      )
      const merged: EventRow[] = list.map((e, i) => ({
        ...e,
        registrationCount:
          countResults[i].status === 'fulfilled' ? countResults[i].value : null,
      }))
      setRows(merged)
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Erro ao carregar eventos'
      setError(msg)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [activeEstablishmentId])

  useEffect(() => {
    void load()
  }, [load])

  function openCreate() {
    setEditingEvent(null)
    setModalOpen(true)
  }

  function openEdit(ev: ScheduledEvent) {
    setEditingEvent(ev)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingEvent(null)
  }

  async function handleDelete(ev: ScheduledEvent) {
    if (!window.confirm(`Eliminar o evento “${ev.name}”?`)) return
    setBusyId(ev.id)
    setError(null)
    try {
      await deleteScheduledEvent(ev.id)
      await load()
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Erro ao eliminar'
      setError(msg)
    } finally {
      setBusyId(null)
    }
  }

  if (activeEstablishmentId == null) {
    return (
      <div className="events-page">
        <div className="events-page__inner">
          <header className="events-page__header">
            <div>
              <p className="events-page__eyebrow">Programação</p>
              <h1 className="events-page__title">Eventos</h1>
              <p className="events-page__sub">Selecione um estabelecimento para gerir a agenda.</p>
            </div>
          </header>
          <p className="events-page__empty">Nenhum estabelecimento disponível nesta conta.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="events-page">
      <div className="events-page__inner">
        <header className="events-page__header">
          <div>
            <p className="events-page__eyebrow">Programação</p>
            <h1 className="events-page__title">Gestão de eventos</h1>
            <p className="events-page__sub">
              Crie e edite eventos, cartaz e reservas de mesa/camarote.
              Lista ordenada do mais recente ao mais antigo (criação).
            </p>
          </div>
          {establishmentOptions.length > 1 ? (
            <>
              <label className="visually-hidden" htmlFor="events-establishment">
                Estabelecimento
              </label>
              <select
                id="events-establishment"
                className="events-page__select"
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

        {error ? <div className="events-page__error">{error}</div> : null}

        <div className="events-page__toolbar">
          {/* <button
            type="button"
            className="events-btn events-btn--ghost"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw size={16} strokeWidth={2} aria-hidden />
            Atualizar
          </button> */}
          <button type="button" className="events-btn events-btn--primary" onClick={openCreate}>
            <Plus size={16} strokeWidth={2} aria-hidden />
            Novo evento
          </button>
        </div>

        {loading ? <p className="events-page__loading">A carregar…</p> : null}

        {!loading && rows.length === 0 ? (
          <p className="events-page__empty">Ainda não há eventos. Crie o primeiro com «Novo evento».</p>
        ) : null}

        {!loading && rows.length > 0 ? (
          <ul className="events-list">
            {rows.map((ev) => (
              <li key={ev.id} className="events-card">
                <div className="events-card__top">
                  {ev.posterImageUrl ? (
                    <img
                      className="events-card__poster"
                      src={ev.posterImageUrl}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <div className="events-card__poster events-card__poster--ph" aria-hidden />
                  )}
                  <div className="events-card__main">
                    <div className="events-card__title-row">
                      <h2 className="events-card__name">{ev.name}</h2>
                      {isUpcoming(ev) ? (
                        <span className="events-card__badge events-card__badge--up">Em breve</span>
                      ) : (
                        <span className="events-card__badge">Realizado</span>
                      )}
                    </div>
                    <p className="events-card__meta">
                      <span className="events-card__list-type">{eventListTypeLabel(ev.listType)}</span>
                      {' · '}
                      <span>
                        {formatSpDateTimeLabel(ev.eventStartsAt)} →{' '}
                        {formatSpDateTimeLabel(ev.eventEndsAt)}
                      </span>
                    </p>
                    {ev.priceInfo ? <p className="events-card__priceinfo">{ev.priceInfo}</p> : null}
                    {ev.dj ? <p className="events-card__dj">DJ: {ev.dj}</p> : null}
                    {ev.attractions ? (
                      <p className="events-card__attr">{ev.attractions}</p>
                    ) : null}
                    {ev.description ? (
                      <p className="events-card__desc">{ev.description}</p>
                    ) : null}

                    <div className="events-card__reservations">
                      {ev.offersTableReservation ? (
                        <p>
                          <strong>Mesa:</strong> {ev.tablePeopleCapacity} pax · {ev.tablesAvailable}{' '}
                          mesas · {ev.tablePrice != null ? formatBrl(ev.tablePrice) : '—'}
                        </p>
                      ) : (
                        <p className="events-card__res-off">Sem reserva de mesa</p>
                      )}
                      {ev.offersBoothReservation ? (
                        <p>
                          <strong>Camarote:</strong> {ev.boothPeopleCapacity} pax ·{' '}
                          {ev.boothsAvailable} camarotes ·{' '}
                          {ev.boothPrice != null ? formatBrl(ev.boothPrice) : '—'}
                        </p>
                      ) : (
                        <p className="events-card__res-off">Sem reserva de camarote</p>
                      )}
                    </div>

                    <p className="events-card__regs">
                      Inscrições:{' '}
                      <strong>
                        {ev.registrationCount != null ? ev.registrationCount : '—'}
                      </strong>
                    </p>
                  </div>
                </div>
                <div className="events-card__actions">
                  <button
                    type="button"
                    className="events-icon-btn"
                    title="Editar"
                    aria-label="Editar"
                    onClick={() => openEdit(ev)}
                    disabled={busyId === ev.id}
                  >
                    <Pencil size={18} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    className="events-icon-btn events-icon-btn--danger"
                    title="Eliminar"
                    aria-label="Eliminar"
                    onClick={() => void handleDelete(ev)}
                    disabled={busyId === ev.id}
                  >
                    <Trash2 size={18} strokeWidth={2} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {modalOpen ? (
        <EventFormModal
          open={modalOpen}
          establishmentId={activeEstablishmentId}
          editingEvent={editingEvent}
          onClose={closeModal}
          onSaved={() => void load()}
        />
      ) : null}
    </div>
  )
}
