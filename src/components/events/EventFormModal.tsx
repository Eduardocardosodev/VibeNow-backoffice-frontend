import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { MenuItemPhotoUpload } from '@/components/menu/MenuItemPhotoUpload'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { ApiError } from '@/lib/apiClient'
import {
  createScheduledEventUpload,
  patchScheduledEventUpload,
} from '@/services/eventsScheduleApi'
import type { EventListType, ScheduledEvent } from '@/types/scheduledEvent'
import { EVENT_LIST_TYPE_OPTIONS } from '@/types/scheduledEvent'
import '@/styles/menu.css'

export interface EventFormModalProps {
  open: boolean
  establishmentId: number
  editingEvent: ScheduledEvent | null
  onClose: () => void
  onSaved: () => void
}

function isoToDatetimeLocal(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toIsoFromLocal(local: string): string | null {
  if (!local.trim()) return null
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function emptyForm() {
  return {
    name: '',
    description: '',
    attractions: '',
    dj: '',
    priceInfo: '',
    eventStartsAtLocal: '',
    eventEndsAtLocal: '',
    listType: 'GENERAL' as EventListType,
    offersTableReservation: false,
    tablePeopleCapacity: '',
    tablesAvailable: '',
    tablePrice: '',
    offersBoothReservation: false,
    boothPeopleCapacity: '',
    boothsAvailable: '',
    boothPrice: '',
  }
}

type FormState = ReturnType<typeof emptyForm>

export function EventFormModal({
  open,
  establishmentId,
  editingEvent,
  onClose,
  onSaved,
}: EventFormModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [basePosterUrl, setBasePosterUrl] = useState<string | null>(null)
  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [posterRemoved, setPosterRemoved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const posterBlobPreview = useObjectUrl(posterFile)
  const posterPreviewSrc = posterBlobPreview ?? (!posterRemoved ? basePosterUrl : null)

  const isEdit = editingEvent != null

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    setError(null)
    if (editingEvent) {
      setBasePosterUrl(editingEvent.posterImageUrl)
      setForm({
        name: editingEvent.name,
        description: editingEvent.description ?? '',
        attractions: editingEvent.attractions ?? '',
        dj: editingEvent.dj ?? '',
        priceInfo: editingEvent.priceInfo ?? '',
        eventStartsAtLocal: isoToDatetimeLocal(editingEvent.eventStartsAt),
        eventEndsAtLocal: isoToDatetimeLocal(editingEvent.eventEndsAt),
        listType: editingEvent.listType,
        offersTableReservation: editingEvent.offersTableReservation,
        tablePeopleCapacity:
          editingEvent.tablePeopleCapacity != null ? String(editingEvent.tablePeopleCapacity) : '',
        tablesAvailable:
          editingEvent.tablesAvailable != null ? String(editingEvent.tablesAvailable) : '',
        tablePrice: editingEvent.tablePrice != null ? String(editingEvent.tablePrice) : '',
        offersBoothReservation: editingEvent.offersBoothReservation,
        boothPeopleCapacity:
          editingEvent.boothPeopleCapacity != null ? String(editingEvent.boothPeopleCapacity) : '',
        boothsAvailable:
          editingEvent.boothsAvailable != null ? String(editingEvent.boothsAvailable) : '',
        boothPrice: editingEvent.boothPrice != null ? String(editingEvent.boothPrice) : '',
      })
    } else {
      setBasePosterUrl(null)
      setForm(emptyForm())
    }
    setPosterFile(null)
    setPosterRemoved(false)
  }, [open, editingEvent])

  if (!open) return null

  function parseRequiredInt(label: string, s: string): number | null {
    const t = s.trim()
    if (!t) {
      setError(`${label} é obrigatório.`)
      return null
    }
    const n = Number.parseInt(t, 10)
    if (Number.isNaN(n) || n < 0) {
      setError(`${label} deve ser um número inteiro ≥ 0.`)
      return null
    }
    return n
  }

  function parseRequiredPrice(label: string, s: string): number | null {
    const t = s.trim()
    if (!t) {
      setError(`${label} é obrigatório.`)
      return null
    }
    const n = Number.parseFloat(t.replace(',', '.'))
    if (Number.isNaN(n) || n < 0) {
      setError(`${label} deve ser um número ≥ 0.`)
      return null
    }
    return n
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.name.trim()) {
      setError('Indique o nome do evento.')
      return
    }

    const starts = toIsoFromLocal(form.eventStartsAtLocal)
    const ends = toIsoFromLocal(form.eventEndsAtLocal)
    if (!starts || !ends) {
      setError('Datas de início e fim inválidas.')
      return
    }
    if (new Date(ends).getTime() <= new Date(starts).getTime()) {
      setError('A data de fim deve ser posterior à de início.')
      return
    }

    let tablePeopleCapacity: number | null = null
    let tablesAvailable: number | null = null
    let tablePrice: number | null = null
    if (form.offersTableReservation) {
      const a = parseRequiredInt('Lugares por mesa', form.tablePeopleCapacity)
      if (a == null) return
      const b = parseRequiredInt('Mesas disponíveis', form.tablesAvailable)
      if (b == null) return
      const c = parseRequiredPrice('Preço da mesa', form.tablePrice)
      if (c == null) return
      tablePeopleCapacity = a
      tablesAvailable = b
      tablePrice = c
    }

    let boothPeopleCapacity: number | null = null
    let boothsAvailable: number | null = null
    let boothPrice: number | null = null
    if (form.offersBoothReservation) {
      const a = parseRequiredInt('Lugares por camarote', form.boothPeopleCapacity)
      if (a == null) return
      const b = parseRequiredInt('Camarotes disponíveis', form.boothsAvailable)
      if (b == null) return
      const c = parseRequiredPrice('Preço do camarote', form.boothPrice)
      if (c == null) return
      boothPeopleCapacity = a
      boothsAvailable = b
      boothPrice = c
    }

    const uploadInput = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      attractions: form.attractions.trim() || null,
      dj: form.dj.trim() || null,
      priceInfo: form.priceInfo.trim() || null,
      eventStartsAt: starts,
      eventEndsAt: ends,
      listType: form.listType,
      offersTableReservation: form.offersTableReservation,
      offersBoothReservation: form.offersBoothReservation,
      tablePeopleCapacity: form.offersTableReservation ? tablePeopleCapacity : null,
      tablesAvailable: form.offersTableReservation ? tablesAvailable : null,
      tablePrice: form.offersTableReservation ? tablePrice : null,
      boothPeopleCapacity: form.offersBoothReservation ? boothPeopleCapacity : null,
      boothsAvailable: form.offersBoothReservation ? boothsAvailable : null,
      boothPrice: form.offersBoothReservation ? boothPrice : null,
      photo: posterFile ?? undefined,
      clearPoster: isEdit && posterRemoved && !posterFile,
      posterImageUrl:
        !posterFile && !posterRemoved && !isEdit && basePosterUrl
          ? basePosterUrl
          : undefined,
    }

    setSaving(true)
    try {
      if (isEdit && editingEvent) {
        await patchScheduledEventUpload(editingEvent.id, {
          ...uploadInput,
        })
      } else {
        await createScheduledEventUpload({
          establishmentId,
          ...uploadInput,
        })
      }
      onSaved()
      onClose()
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Erro ao guardar'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="ev-modal" role="dialog" aria-modal="true" aria-labelledby="ev-modal-title">
      <button type="button" className="ev-modal__backdrop" aria-label="Fechar" onClick={onClose} />
      <div className="ev-modal__panel">
        <div className="ev-modal__head">
          <h2 id="ev-modal-title" className="ev-modal__title">
            {isEdit ? 'Editar evento' : 'Novo evento'}
          </h2>
          <button type="button" className="ev-modal__close" onClick={onClose} aria-label="Fechar">
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <form className="ev-modal__form" onSubmit={handleSubmit}>
          {error ? <p className="ev-modal__error">{error}</p> : null}

          <fieldset className="ev-fieldset">
            <legend className="ev-fieldset__legend">Informação geral</legend>
            <div className="ev-field">
              <label htmlFor="ev-name">Nome</label>
              <input
                id="ev-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                maxLength={200}
                required
              />
            </div>
            <div className="ev-field">
              <label htmlFor="ev-desc">Descrição</label>
              <textarea
                id="ev-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="ev-field">
              <label htmlFor="ev-attr">Atrações</label>
              <input
                id="ev-attr"
                value={form.attractions}
                onChange={(e) => setForm((f) => ({ ...f, attractions: e.target.value }))}
              />
            </div>
            <div className="ev-field">
              <label htmlFor="ev-dj">DJ</label>
              <input id="ev-dj" value={form.dj} onChange={(e) => setForm((f) => ({ ...f, dj: e.target.value }))} />
            </div>
            <div className="ev-field">
              <label htmlFor="ev-priceinfo">Preços / entrada (texto)</label>
              <input
                id="ev-priceinfo"
                value={form.priceInfo}
                onChange={(e) => setForm((f) => ({ ...f, priceInfo: e.target.value }))}
                placeholder="Ex.: Entrada R$ 30"
              />
            </div>
            <div className="ev-field">
              <label htmlFor="ev-poster">Cartaz (imagem)</label>
              <MenuItemPhotoUpload
                id="ev-poster"
                previewSrc={posterPreviewSrc}
                onFileSelected={(f) => {
                  setPosterFile(f)
                  setPosterRemoved(false)
                }}
                onClear={() => {
                  setPosterFile(null)
                  setPosterRemoved(true)
                }}
                disabled={saving}
                hint="Ao guardar, o cartaz vai no campo photo do FormData (POST/PATCH …/events-schedule/…/upload), com os restantes campos em string."
              />
            </div>
            <div className="ev-field">
              <label htmlFor="ev-list">Tipo de lista</label>
              <select
                id="ev-list"
                value={form.listType}
                onChange={(e) => setForm((f) => ({ ...f, listType: e.target.value as EventListType }))}
              >
                {EVENT_LIST_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          <fieldset className="ev-fieldset">
            <legend className="ev-fieldset__legend">Datas (horário local)</legend>
            <div className="ev-field ev-field--half">
              <label htmlFor="ev-start">Início</label>
              <input
                id="ev-start"
                type="datetime-local"
                value={form.eventStartsAtLocal}
                onChange={(e) => setForm((f) => ({ ...f, eventStartsAtLocal: e.target.value }))}
                required
              />
            </div>
            <div className="ev-field ev-field--half">
              <label htmlFor="ev-end">Fim</label>
              <input
                id="ev-end"
                type="datetime-local"
                value={form.eventEndsAtLocal}
                onChange={(e) => setForm((f) => ({ ...f, eventEndsAtLocal: e.target.value }))}
                required
              />
            </div>
          </fieldset>

          <fieldset className="ev-fieldset">
            <legend className="ev-fieldset__legend">Reserva de mesa</legend>
            <label className="ev-check">
              <input
                type="checkbox"
                checked={form.offersTableReservation}
                onChange={(e) =>
                  setForm((f) => ({ ...f, offersTableReservation: e.target.checked }))
                }
              />
              Oferece reserva de mesa
            </label>
            {form.offersTableReservation ? (
              <div className="ev-grid-3">
                <div className="ev-field">
                  <label htmlFor="ev-tcap">Lugares / mesa</label>
                  <input
                    id="ev-tcap"
                    inputMode="numeric"
                    value={form.tablePeopleCapacity}
                    onChange={(e) => setForm((f) => ({ ...f, tablePeopleCapacity: e.target.value }))}
                  />
                </div>
                <div className="ev-field">
                  <label htmlFor="ev-tavail">Mesas disponíveis</label>
                  <input
                    id="ev-tavail"
                    inputMode="numeric"
                    value={form.tablesAvailable}
                    onChange={(e) => setForm((f) => ({ ...f, tablesAvailable: e.target.value }))}
                  />
                </div>
                <div className="ev-field">
                  <label htmlFor="ev-tprice">Preço (R$)</label>
                  <input
                    id="ev-tprice"
                    inputMode="decimal"
                    value={form.tablePrice}
                    onChange={(e) => setForm((f) => ({ ...f, tablePrice: e.target.value }))}
                  />
                </div>
              </div>
            ) : null}
          </fieldset>

          <fieldset className="ev-fieldset">
            <legend className="ev-fieldset__legend">Reserva de camarote</legend>
            <label className="ev-check">
              <input
                type="checkbox"
                checked={form.offersBoothReservation}
                onChange={(e) =>
                  setForm((f) => ({ ...f, offersBoothReservation: e.target.checked }))
                }
              />
              Oferece reserva de camarote
            </label>
            {form.offersBoothReservation ? (
              <div className="ev-grid-3">
                <div className="ev-field">
                  <label htmlFor="ev-bcap">Lugares / camarote</label>
                  <input
                    id="ev-bcap"
                    inputMode="numeric"
                    value={form.boothPeopleCapacity}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, boothPeopleCapacity: e.target.value }))
                    }
                  />
                </div>
                <div className="ev-field">
                  <label htmlFor="ev-bavail">Camarotes disponíveis</label>
                  <input
                    id="ev-bavail"
                    inputMode="numeric"
                    value={form.boothsAvailable}
                    onChange={(e) => setForm((f) => ({ ...f, boothsAvailable: e.target.value }))}
                  />
                </div>
                <div className="ev-field">
                  <label htmlFor="ev-bprice">Preço (R$)</label>
                  <input
                    id="ev-bprice"
                    inputMode="decimal"
                    value={form.boothPrice}
                    onChange={(e) => setForm((f) => ({ ...f, boothPrice: e.target.value }))}
                  />
                </div>
              </div>
            ) : null}
          </fieldset>

          <div className="ev-modal__actions">
            <button type="button" className="ev-btn ev-btn--ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="ev-btn ev-btn--primary" disabled={saving}>
              {saving ? 'A guardar…' : isEdit ? 'Guardar' : 'Criar evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
