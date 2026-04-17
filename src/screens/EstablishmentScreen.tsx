import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, Clock, MapPin } from 'lucide-react'
import { useAuth } from '@/contexts'
import { ApiError } from '@/lib/apiClient'
import { fetchEstablishment, patchEstablishment } from '@/services/establishmentApi'
import { fetchViaCep } from '@/services/viaCep'
import { geocodeBrazilAddress } from '@/services/geocodeAddress'
import { cnpjDigits, formatCnpjInput } from '@/utils/formatCnpj'
import { formatCepMask } from '@/services/viaCep'
import type {
  DayHoursSlot,
  Establishment,
  EstablishmentType,
  OpeningHoursDayKey,
  PatchEstablishmentBody,
} from '@/types/establishment'
import '@/styles/establishment.css'

/* ── constants ────────────────────────────────────────────── */

const DAYS: { key: OpeningHoursDayKey; label: string; short: string }[] = [
  { key: 'monday', label: 'Segunda-feira', short: 'Seg' },
  { key: 'tuesday', label: 'Terça-feira', short: 'Ter' },
  { key: 'wednesday', label: 'Quarta-feira', short: 'Qua' },
  { key: 'thursday', label: 'Quinta-feira', short: 'Qui' },
  { key: 'friday', label: 'Sexta-feira', short: 'Sex' },
  { key: 'saturday', label: 'Sábado', short: 'Sáb' },
  { key: 'sunday', label: 'Domingo', short: 'Dom' },
]

const DEFAULT_OPEN = '18:00'
const DEFAULT_CLOSE = '02:00'

type HoursState = Record<OpeningHoursDayKey, DayHoursSlot | null>

interface FormState {
  name: string
  cnpj: string
  address: string
  addressNumber: string
  city: string
  state: string
  zipCode: string
  phone: string
  email: string
  instagram: string
  establishmentType: string
  hours: HoursState
}

const EMPTY_HOURS: HoursState = {
  monday: null,
  tuesday: null,
  wednesday: null,
  thursday: null,
  friday: null,
  saturday: null,
  sunday: null,
}

const EMPTY_FORM: FormState = {
  name: '',
  cnpj: '',
  address: '',
  addressNumber: '',
  city: '',
  state: '',
  zipCode: '',
  phone: '',
  email: '',
  instagram: '',
  establishmentType: 'LOUNGE',
  hours: { ...EMPTY_HOURS },
}

/* ── helpers ──────────────────────────────────────────────── */

function phoneDigits(v: string): string {
  return v.replace(/\D/g, '')
}

function formatPhoneBr(raw: string): string {
  const d = phoneDigits(raw).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function estToForm(est: Establishment): FormState {
  const hours: HoursState = { ...EMPTY_HOURS }
  if (est.openingHours) {
    for (const d of DAYS) {
      const slot = est.openingHours[d.key]
      if (slot) hours[d.key] = { open: slot.open, close: slot.close }
    }
  }
  return {
    name: est.name ?? '',
    cnpj: formatCnpjInput(est.cnpj ?? ''),
    address: est.address ?? '',
    addressNumber: est.addressNumber ?? '',
    city: est.city ?? '',
    state: est.state ?? '',
    zipCode: formatCepMask(est.zipCode ?? ''),
    phone: formatPhoneBr(est.phone ?? ''),
    email: est.email ?? '',
    instagram: est.instagram ?? '',
    establishmentType: est.establishmentType ?? 'LOUNGE',
    hours,
  }
}

function buildPatch(
  cur: FormState,
  ini: FormState,
  coords?: { lat: number; lon: number },
): PatchEstablishmentBody {
  const body: PatchEstablishmentBody = {}
  const t = (s: string) => s.trim()

  if (t(cur.name) !== t(ini.name)) body.name = t(cur.name)
  const cc = cnpjDigits(cur.cnpj)
  const ic = cnpjDigits(ini.cnpj)
  if (cc !== ic) body.cnpj = cc
  if (t(cur.address) !== t(ini.address)) body.address = t(cur.address)
  if (t(cur.addressNumber) !== t(ini.addressNumber)) body.addressNumber = t(cur.addressNumber)
  if (t(cur.city) !== t(ini.city)) body.city = t(cur.city)
  if (t(cur.state) !== t(ini.state)) body.state = t(cur.state)
  const cz = cur.zipCode.replace(/\D/g, '')
  const iz = ini.zipCode.replace(/\D/g, '')
  if (cz !== iz) body.zipCode = cz
  const cp = phoneDigits(cur.phone)
  const ip = phoneDigits(ini.phone)
  if (cp !== ip) body.phone = cp
  if (t(cur.email) !== t(ini.email)) body.email = t(cur.email)
  if (t(cur.instagram) !== t(ini.instagram)) body.instagram = t(cur.instagram)
  if (cur.establishmentType !== ini.establishmentType) {
    body.establishmentType = cur.establishmentType as EstablishmentType
  }
  if (JSON.stringify(cur.hours) !== JSON.stringify(ini.hours)) {
    body.openingHours = cur.hours
  }
  if (coords) {
    body.latitude = coords.lat
    body.longitude = coords.lon
  }
  return body
}

/* ── component ────────────────────────────────────────────── */

export function EstablishmentScreen() {
  const { access, activeEstablishmentId, selectEstablishment } = useAuth()

  const [establishment, setEstablishment] = useState<Establishment | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [initial, setInitial] = useState<FormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError] = useState<string | null>(null)

  const establishmentOptions = useMemo(() => {
    const m = new Map<number, string>()
    access?.ownedEstablishments.forEach((e) => m.set(e.id, e.name))
    access?.employments.forEach((e) => m.set(e.establishmentId, e.establishmentName))
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1], 'pt'))
  }, [access])

  const isOwner = useMemo(() => {
    if (!access || activeEstablishmentId == null) return false
    return access.ownedEstablishments.some((e) => e.id === activeEstablishmentId)
  }, [access, activeEstablishmentId])

  useEffect(() => {
    if (activeEstablishmentId == null && establishmentOptions.length === 1) {
      selectEstablishment(establishmentOptions[0][0])
    }
  }, [activeEstablishmentId, establishmentOptions, selectEstablishment])

  const load = useCallback(async () => {
    if (activeEstablishmentId == null) {
      setEstablishment(null)
      setLoading(false)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const est = await fetchEstablishment(activeEstablishmentId)
      setEstablishment(est)
      const fd = estToForm(est)
      setForm(fd)
      setInitial(fd)
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Erro ao carregar dados'
      setError(msg)
      setEstablishment(null)
    } finally {
      setLoading(false)
    }
  }, [activeEstablishmentId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  /* ── CEP auto-fill ──────────────────────────────────────── */

  useEffect(() => {
    const digits = form.zipCode.replace(/\D/g, '')
    if (digits.length !== 8) return
    if (digits === initial.zipCode.replace(/\D/g, '')) return

    let cancelled = false
    setCepLoading(true)
    setCepError(null)

    fetchViaCep(digits)
      .then((data) => {
        if (cancelled) return
        setForm((prev) => ({
          ...prev,
          address: data.logradouro || prev.address,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }))
      })
      .catch((e) => {
        if (cancelled) return
        setCepError(e instanceof Error ? e.message : 'Erro ao consultar CEP')
      })
      .finally(() => {
        if (!cancelled) setCepLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [form.zipCode, initial.zipCode])

  /* ── dirty check ────────────────────────────────────────── */

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initial),
    [form, initial],
  )
  const canSave = isDirty && !saving && isOwner

  /* ── form updaters ──────────────────────────────────────── */

  function upd<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleDay(key: OpeningHoursDayKey) {
    setForm((prev) => ({
      ...prev,
      hours: {
        ...prev.hours,
        [key]: prev.hours[key] ? null : { open: DEFAULT_OPEN, close: DEFAULT_CLOSE },
      },
    }))
  }

  function updateDayTime(key: OpeningHoursDayKey, field: 'open' | 'close', value: string) {
    setForm((prev) => {
      const slot = prev.hours[key]
      if (!slot) return prev
      return { ...prev, hours: { ...prev.hours, [key]: { ...slot, [field]: value } } }
    })
  }

  /* ── save ────────────────────────────────────────────────── */

  async function handleSave() {
    if (!canSave || activeEstablishmentId == null) return
    setSaving(true)
    setError(null)
    setToast(null)

    let coords: { lat: number; lon: number } | undefined
    const addrChanged =
      form.address.trim() !== initial.address.trim() ||
      form.addressNumber.trim() !== initial.addressNumber.trim() ||
      form.city.trim() !== initial.city.trim() ||
      form.state.trim() !== initial.state.trim() ||
      form.zipCode.replace(/\D/g, '') !== initial.zipCode.replace(/\D/g, '')

    if (addrChanged) {
      try {
        coords = await geocodeBrazilAddress({
          street: `${form.address.trim()} ${form.addressNumber.trim()}`.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          postalcode: form.zipCode,
        })
      } catch {
        /* geocoding silently skipped */
      }
    }

    const body = buildPatch(form, initial, coords)
    if (Object.keys(body).length === 0) {
      setSaving(false)
      return
    }

    try {
      const updated = await patchEstablishment(activeEstablishmentId, body)
      setEstablishment(updated)
      const fd = estToForm(updated)
      setForm(fd)
      setInitial(fd)
      setToast('Dados atualizados com sucesso.')
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Erro ao guardar'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  function handleDiscard() {
    setForm({ ...initial })
    setError(null)
    setCepError(null)
  }

  /* ── render: no establishment selected ──────────────────── */

  if (activeEstablishmentId == null) {
    return (
      <div className="est-page">
        <div className="est-page__inner">
          <header className="est-page__header">
            <div>
              <p className="est-page__eyebrow">Painel</p>
              <h1 className="est-page__title">Estabelecimento</h1>
              <p className="est-page__sub">
                Selecione um estabelecimento para ver e editar os dados.
              </p>
            </div>
          </header>
          <p className="est-page__empty">Nenhum estabelecimento disponível nesta conta.</p>
        </div>
      </div>
    )
  }

  /* ── render: main ───────────────────────────────────────── */

  const disabled = saving || !isOwner

  return (
    <div className="est-page">
      <div className="est-page__inner">
        <header className="est-page__header">
          <div>
            <p className="est-page__eyebrow">Painel</p>
            <h1 className="est-page__title">Estabelecimento</h1>
            <p className="est-page__sub">
              {isOwner
                ? 'Edite as informações e o horário de funcionamento do seu estabelecimento.'
                : 'Visualize as informações do estabelecimento. Somente o dono pode editar.'}
            </p>
          </div>
          {establishmentOptions.length > 1 ? (
            <>
              <label className="est-sr-only" htmlFor="est-select">
                Estabelecimento
              </label>
              <select
                id="est-select"
                className="est-page__select"
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

        {toast ? (
          <div className="est-toast" role="status" aria-live="polite">
            {toast}
          </div>
        ) : null}

        {error ? <div className="est-page__error">{error}</div> : null}

        {loading ? <p className="est-page__loading">A carregar…</p> : null}

        {!loading && establishment ? (
          <form
            className="est-card"
            onSubmit={(e) => {
              e.preventDefault()
              void handleSave()
            }}
            noValidate
          >
            {/* ── Section: Informações Gerais ──────────────── */}
            <section className="est-section" aria-labelledby="est-info-title">
              <div className="est-section__head">
                <span className="est-section__icon" aria-hidden>
                  <Building2 size={18} />
                </span>
                <h2 id="est-info-title" className="est-section__title">
                  Informações gerais
                </h2>
              </div>

              <div className="est-grid est-grid--2">
                <div className="est-field">
                  <label htmlFor="est-name" className="est-field__label">
                    Nome do estabelecimento
                  </label>
                  <input
                    id="est-name"
                    type="text"
                    className="est-input"
                    value={form.name}
                    onChange={(e) => upd('name', e.target.value)}
                    maxLength={100}
                    disabled={disabled}
                  />
                </div>

                <div className="est-field">
                  <label htmlFor="est-type" className="est-field__label">
                    Tipo
                  </label>
                  <select
                    id="est-type"
                    className="est-input"
                    value={form.establishmentType}
                    onChange={(e) => upd('establishmentType', e.target.value)}
                    disabled={disabled}
                  >
                    <option value="LOUNGE">Lounge</option>
                    <option value="PARTY">Party</option>
                  </select>
                </div>

                <div className="est-field">
                  <label htmlFor="est-cnpj" className="est-field__label">
                    CNPJ
                  </label>
                  <input
                    id="est-cnpj"
                    type="text"
                    className="est-input"
                    value={form.cnpj}
                    onChange={(e) => upd('cnpj', formatCnpjInput(e.target.value))}
                    placeholder="00.000.000/0000-00"
                    disabled={disabled}
                  />
                </div>

                <div className="est-field">
                  <label htmlFor="est-phone" className="est-field__label">
                    Telefone
                  </label>
                  <input
                    id="est-phone"
                    type="tel"
                    className="est-input"
                    value={form.phone}
                    onChange={(e) => upd('phone', formatPhoneBr(e.target.value))}
                    placeholder="(51) 99800-1234"
                    disabled={disabled}
                  />
                </div>

                <div className="est-field">
                  <label htmlFor="est-email" className="est-field__label">
                    E-mail
                  </label>
                  <input
                    id="est-email"
                    type="email"
                    className="est-input"
                    value={form.email}
                    onChange={(e) => upd('email', e.target.value)}
                    disabled={disabled}
                  />
                </div>

                <div className="est-field">
                  <label htmlFor="est-instagram" className="est-field__label">
                    Instagram
                  </label>
                  <input
                    id="est-instagram"
                    type="text"
                    className="est-input"
                    value={form.instagram}
                    onChange={(e) => upd('instagram', e.target.value)}
                    placeholder="@seulounge"
                    maxLength={100}
                    disabled={disabled}
                  />
                </div>
              </div>
            </section>

            {/* ── Section: Endereço ────────────────────────── */}
            <section className="est-section" aria-labelledby="est-addr-title">
              <div className="est-section__head">
                <span className="est-section__icon" aria-hidden>
                  <MapPin size={18} />
                </span>
                <h2 id="est-addr-title" className="est-section__title">
                  Endereço
                </h2>
              </div>

              <div className="est-grid est-grid--addr">
                <div className="est-field est-field--cep">
                  <label htmlFor="est-cep" className="est-field__label">
                    CEP
                  </label>
                  <div className="est-cep-wrap">
                    <input
                      id="est-cep"
                      type="text"
                      className="est-input"
                      value={form.zipCode}
                      onChange={(e) => upd('zipCode', formatCepMask(e.target.value))}
                      placeholder="00000-000"
                      disabled={disabled}
                    />
                    {cepLoading ? (
                      <span className="est-cep-status est-cep-status--loading">Buscando…</span>
                    ) : null}
                  </div>
                  {cepError ? <p className="est-field__error">{cepError}</p> : null}
                </div>

                <div className="est-field est-field--address">
                  <label htmlFor="est-address" className="est-field__label">
                    Endereço
                  </label>
                  <input
                    id="est-address"
                    type="text"
                    className="est-input"
                    value={form.address}
                    onChange={(e) => upd('address', e.target.value)}
                    maxLength={200}
                    disabled={disabled}
                  />
                </div>

                <div className="est-field est-field--number">
                  <label htmlFor="est-number" className="est-field__label">
                    Número
                  </label>
                  <input
                    id="est-number"
                    type="text"
                    className="est-input"
                    value={form.addressNumber}
                    onChange={(e) => upd('addressNumber', e.target.value)}
                    placeholder="S/N"
                    maxLength={30}
                    disabled={disabled}
                  />
                </div>

                <div className="est-field est-field--city">
                  <label htmlFor="est-city" className="est-field__label">
                    Cidade
                  </label>
                  <input
                    id="est-city"
                    type="text"
                    className="est-input"
                    value={form.city}
                    onChange={(e) => upd('city', e.target.value)}
                    maxLength={100}
                    disabled={disabled}
                  />
                </div>

                <div className="est-field est-field--state">
                  <label htmlFor="est-state" className="est-field__label">
                    UF
                  </label>
                  <input
                    id="est-state"
                    type="text"
                    className="est-input"
                    value={form.state}
                    onChange={(e) => upd('state', e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="RS"
                    maxLength={2}
                    disabled={disabled}
                  />
                </div>
              </div>
            </section>

            {/* ── Section: Horário de Funcionamento ─────────── */}
            <section className="est-section" aria-labelledby="est-hours-title">
              <div className="est-section__head">
                <span className="est-section__icon" aria-hidden>
                  <Clock size={18} />
                </span>
                <h2 id="est-hours-title" className="est-section__title">
                  Horário de funcionamento
                </h2>
              </div>

              <div className="est-hours">
                {DAYS.map(({ key, label, short }) => {
                  const slot = form.hours[key]
                  const isOpen = slot !== null
                  return (
                    <div
                      key={key}
                      className={`est-hours__row${!isOpen ? ' est-hours__row--closed' : ''}`}
                    >
                      <label className="est-hours__toggle">
                        <input
                          type="checkbox"
                          checked={isOpen}
                          onChange={() => toggleDay(key)}
                          disabled={disabled}
                        />
                        <span className="est-hours__check" aria-hidden />
                      </label>

                      <span className="est-hours__day" title={label}>
                        <span className="est-hours__day-full">{label}</span>
                        <span className="est-hours__day-short">{short}</span>
                      </span>

                      {isOpen ? (
                        <div className="est-hours__times">
                          <input
                            type="time"
                            className="est-input est-input--time"
                            value={slot.open}
                            onChange={(e) => updateDayTime(key, 'open', e.target.value)}
                            disabled={disabled}
                            aria-label={`${label} abertura`}
                          />
                          <span className="est-hours__sep">às</span>
                          <input
                            type="time"
                            className="est-input est-input--time"
                            value={slot.close}
                            onChange={(e) => updateDayTime(key, 'close', e.target.value)}
                            disabled={disabled}
                            aria-label={`${label} encerramento`}
                          />
                        </div>
                      ) : (
                        <span className="est-hours__closed-label">Fechado</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            {/* ── Actions ──────────────────────────────────── */}
            {isOwner ? (
              <div className="est-card__actions">
                {isDirty ? (
                  <button
                    type="button"
                    className="est-btn est-btn--ghost"
                    onClick={handleDiscard}
                    disabled={saving}
                  >
                    Descartar
                  </button>
                ) : null}
                <button type="submit" className="est-btn est-btn--primary" disabled={!canSave}>
                  {saving ? 'A guardar…' : 'Guardar alterações'}
                </button>
              </div>
            ) : null}
          </form>
        ) : null}
      </div>
    </div>
  )
}
