import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getApiBaseUrl } from '@/lib/apiBaseUrl'
import { useAuth } from '@/contexts'
import { geocodeBrazilAddress } from '@/services/geocodeAddress'
import {
  fetchViaCep,
  formatCepMask,
  ViaCepError,
  type ViaCepSuccess,
} from '@/services/viaCep'
import type { EstablishmentType, RegisterEstablishmentAndOwnerBody } from '@/types/auth'
import { cnpjDigits, formatCnpjInput } from '@/utils'
import { digitsOnly, formatPhoneDisplay } from '@/utils/formatPhoneBRL'
import '@/styles/authLayout.css'

function onlyDigits(s: string): string {
  return s.replace(/\D/g, '')
}

export function RegisterScreen() {
  const { registerEstablishmentAndOwner, error, clearError } = useAuth()
  const navigate = useNavigate()

  const [establishmentName, setEstablishmentName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [address, setAddress] = useState('')
  const [addressNumber, setAddressNumber] = useState('')
  const [city, setCity] = useState('')
  const [stateUf, setStateUf] = useState('')
  const [instagram, setInstagram] = useState('')
  const [establishmentType, setEstablishmentType] = useState<EstablishmentType>('LOUNGE')
  const [latitudeStr, setLatitudeStr] = useState('')
  const [longitudeStr, setLongitudeStr] = useState('')
  const [profilePhoto, setProfilePhoto] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [cepLookupError, setCepLookupError] = useState<string | null>(null)

  const lastAutoCepRef = useRef<string>('')

  const apiMissing = !getApiBaseUrl()

  function applyViaCepData(data: ViaCepSuccess) {
    const rawCep = onlyDigits(data.cep)
    setZipCode(formatCepMask(rawCep.slice(0, 8)))
    setCity(data.localidade)
    setStateUf(data.uf)
    const line = [data.logradouro, data.bairro].filter(Boolean).join(', ')
    setAddress(line)
  }

  useEffect(() => {
    const d = onlyDigits(zipCode)
    if (d.length !== 8) {
      lastAutoCepRef.current = ''
      return
    }

    const t = setTimeout(() => {
      if (onlyDigits(zipCode) !== d) return
      if (lastAutoCepRef.current === d) return

      void (async () => {
        setCepLookupError(null)
        try {
          const data = await fetchViaCep(d)
          lastAutoCepRef.current = d
          applyViaCepData(data)
        } catch (e) {
          setCepLookupError(e instanceof ViaCepError ? e.message : 'CEP não encontrado.')
        }
      })()
    }, 550)

    return () => clearTimeout(t)
  }, [zipCode])

  useEffect(() => {
    const zip = onlyDigits(zipCode)
    if (zip.length !== 8 || stateUf.trim().length !== 2 || city.trim().length < 2) {
      if (zip.length !== 8) {
        setLatitudeStr('')
        setLongitudeStr('')
      }
      return
    }

    let cancelled = false
    const t = setTimeout(() => {
      void (async () => {
        try {
          const streetLine = [address.trim(), addressNumber.trim()].filter(Boolean).join(', ')
          const { lat, lon } = await geocodeBrazilAddress({
            street: streetLine,
            city: city.trim(),
            state: stateUf.trim().toUpperCase(),
            postalcode: zip,
          })
          if (cancelled) return
          setLatitudeStr(lat.toFixed(7))
          setLongitudeStr(lon.toFixed(7))
        } catch {
          if (cancelled) return
          setLatitudeStr('')
          setLongitudeStr('')
        }
      })()
    }, 800)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [address, addressNumber, city, stateUf, zipCode])

  function validateAndBuildBody(): RegisterEstablishmentAndOwnerBody | null {
    const cnpjForApi = cnpjDigits(cnpj)
    if (cnpjForApi.length !== 14) {
      setFormError('CNPJ deve ter exatamente 14 dígitos.')
      return null
    }

    const uf = stateUf.trim().toUpperCase()
    if (uf.length !== 2 || !/^[A-Z]{2}$/.test(uf)) {
      setFormError('UF inválida (use 2 letras, ex.: RS).')
      return null
    }

    const zipDigits = onlyDigits(zipCode)
    if (zipDigits.length !== 8) {
      setFormError('CEP deve ter 8 dígitos.')
      return null
    }
    const zipForApi = formatCepMask(zipDigits)

    const lat = Number.parseFloat(latitudeStr.replace(',', '.'))
    const lng = Number.parseFloat(longitudeStr.replace(',', '.'))
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      setFormError(
        'Não foi possível obter a localização a partir do endereço. Confirme CEP, morada, cidade e UF e tente de novo.',
      )
      return null
    }
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      setFormError(
        'Não foi possível obter a localização a partir do endereço. Confirme CEP, morada, cidade e UF e tente de novo.',
      )
      return null
    }

    const ig = instagram.trim()
    if (!ig) {
      setFormError('Instagram é obrigatório.')
      return null
    }

    const oname = ownerName.trim()
    if (oname.length > 0 && oname.length < 3) {
      setFormError('Nome do responsável deve ter pelo menos 3 caracteres ou ficar vazio.')
      return null
    }

    const photo = profilePhoto.trim()
    if (photo.length > 500) {
      setFormError('URL da foto de perfil é demasiado longa (máx. 500 caracteres).')
      return null
    }

    const addr = address.trim()
    if (addr.length < 2) {
      setFormError('Indique a morada (logradouro / rua).')
      return null
    }

    const num = addressNumber.trim()
    if (!num) {
      setFormError('Indique o número do endereço.')
      return null
    }

    const phoneDigits = digitsOnly(phone)
    if (phoneDigits.length !== 10 && phoneDigits.length !== 11) {
      setFormError('Telefone: use apenas DDD + número (10 ou 11 dígitos, sem +55).')
      return null
    }

    const body: RegisterEstablishmentAndOwnerBody = {
      name: establishmentName.trim(),
      cnpj: cnpjForApi,
      address: addr,
      addressNumber: num,
      city: city.trim(),
      state: uf,
      zipCode: zipForApi,
      phone: phoneDigits,
      email: email.trim(),
      instagram: ig,
      establishmentType,
      latitude: lat,
      longitude: lng,
      password,
    }

    if (oname) body.ownerName = oname
    if (photo) body.profilePhoto = photo

    return body
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    clearError()
    setFormError(null)
    const body = validateAndBuildBody()
    if (!body) return

    setSubmitting(true)
    try {
      await registerEstablishmentAndOwner(body)
      navigate('/', { replace: true })
    } catch {
      /* mensagem no contexto */
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card auth-card-wide">
        <h1 className="auth-title">Registar estabelecimento</h1>
        <p className="auth-subtitle">
          Cria a ficha do negócio e a tua conta de dono num único passo. O e-mail e a palavra-passe
          passam a ser o teu acesso ao portal.
        </p>

        {apiMissing && (
          <p className="auth-config-hint">
            Configure <code>VITE_API_BASE_URL</code> no ficheiro <code>.env</code> e reinicie o
            servidor de desenvolvimento.
          </p>
        )}

        {formError ? <p className="auth-error">{formError}</p> : null}
        {error ? <p className="auth-error">{error}</p> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <h2 className="auth-section-title">Estabelecimento</h2>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-est-name">
              Nome fantasia
            </label>
            <input
              id="reg-est-name"
              className="auth-input"
              type="text"
              maxLength={100}
              minLength={2}
              value={establishmentName}
              onChange={(ev) => setEstablishmentName(ev.target.value)}
              required
              disabled={apiMissing || submitting}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-cnpj">
              CNPJ
            </label>
            <input
              id="reg-cnpj"
              className="auth-input"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="00.000.000/0001-00"
              maxLength={18}
              value={cnpj}
              onChange={(ev) => setCnpj(formatCnpjInput(ev.target.value))}
              required
              disabled={apiMissing || submitting}
            />
          </div>

          <h2 className="auth-section-title">Endereço</h2>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-cep">
              CEP
            </label>
            <input
              id="reg-cep"
              className="auth-input"
              type="text"
              inputMode="numeric"
              maxLength={9}
              placeholder="00000-000"
              value={zipCode}
              onChange={(ev) => {
                const raw = onlyDigits(ev.target.value).slice(0, 8)
                setZipCode(raw.length <= 5 ? raw : `${raw.slice(0, 5)}-${raw.slice(5)}`)
              }}
              required
              disabled={apiMissing || submitting}
            />
          </div>
          {cepLookupError ? <p className="auth-hint" style={{ color: 'var(--color-error)' }}>{cepLookupError}</p> : null}


          <div className="auth-grid-2">
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-address">
                Logradouro (rua, avenida…)
              </label>
              <input
                id="reg-address"
                className="auth-input"
                type="text"
                maxLength={200}
                value={address}
                onChange={(ev) => setAddress(ev.target.value)}
                required
                disabled={apiMissing || submitting}
              />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-address-number">
                Número
              </label>
              <input
                id="reg-address-number"
                className="auth-input"
                type="text"
                inputMode="text"
                maxLength={20}
                placeholder="1500"
                autoComplete="address-line2"
                value={addressNumber}
                onChange={(ev) => setAddressNumber(ev.target.value)}
                required
                disabled={apiMissing || submitting}
              />
            </div>
          </div>

          <div className="auth-grid-2">
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-city">
                Cidade
              </label>
              <input
                id="reg-city"
                className="auth-input"
                type="text"
                maxLength={100}
                value={city}
                onChange={(ev) => setCity(ev.target.value)}
                required
                disabled={apiMissing || submitting}
              />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-uf">
                UF
              </label>
              <input
                id="reg-uf"
                className="auth-input"
                type="text"
                maxLength={2}
                placeholder="RS"
                value={stateUf}
                onChange={(ev) => setStateUf(ev.target.value.toUpperCase())}
                required
                disabled={apiMissing || submitting}
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-instagram">
              Instagram
            </label>
            <input
              id="reg-instagram"
              className="auth-input"
              type="text"
              maxLength={100}
              placeholder="@meuestabelecimento"
              value={instagram}
              onChange={(ev) => setInstagram(ev.target.value)}
              required
              disabled={apiMissing || submitting}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-type">
              Tipo
            </label>
            <select
              id="reg-type"
              className="auth-select"
              value={establishmentType}
              onChange={(ev) => setEstablishmentType(ev.target.value as EstablishmentType)}
              required
              disabled={apiMissing || submitting}
            >
              <option value="LOUNGE">Lounge</option>
              <option value="PARTY">Festa</option>
            </select>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-photo">
              URL da foto de perfil (opcional)
            </label>
            <input
              id="reg-photo"
              className="auth-input"
              type="url"
              maxLength={500}
              placeholder="https://…"
              value={profilePhoto}
              onChange={(ev) => setProfilePhoto(ev.target.value)}
              disabled={apiMissing || submitting}
            />
          </div>

          <h2 className="auth-section-title">Conta do dono</h2>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-owner-name">
              Nome do responsável no portal (opcional)
            </label>
            <input
              id="reg-owner-name"
              className="auth-input"
              type="text"
              maxLength={80}
              placeholder="Se vazio, usa o nome fantasia"
              value={ownerName}
              onChange={(ev) => setOwnerName(ev.target.value)}
              disabled={apiMissing || submitting}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-email">
              E-mail (login no portal)
            </label>
            <input
              id="reg-email"
              className="auth-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
              disabled={apiMissing || submitting}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-phone">
              Telefone do dono (DDD + número)
            </label>
            <input
              id="reg-phone"
              className="auth-input"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={15}
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(ev) => setPhone(formatPhoneDisplay(ev.target.value))}
              required
              disabled={apiMissing || submitting}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-password">
              Palavra-passe
            </label>
            <input
              id="reg-password"
              className="auth-input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
              minLength={8}
              maxLength={72}
              disabled={apiMissing || submitting}
            />
          </div>

          <button
            type="submit"
            className="auth-primary-btn"
            disabled={apiMissing || submitting}
          >
            {submitting ? 'A criar estabelecimento…' : 'Criar estabelecimento e conta'}
          </button>
        </form>

        <div className="auth-footer">
          Já tem conta? <Link to="/login">Entrar</Link>
        </div>
      </div>
    </div>
  )
}
