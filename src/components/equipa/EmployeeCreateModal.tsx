import { useEffect, useState } from 'react'
import { Check, Eye, EyeOff, X } from 'lucide-react'
import { ApiError } from '@/lib/apiClient'
import { createEmployee } from '@/services/employeeApi'
import type { CreatedEmployee, EmployeeListItem } from '@/types/employee'

const PHONE_RE = /^\d{10,15}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

interface FieldErrors {
  name?: string
  phone?: string
  email?: string
  password?: string
}

interface Props {
  establishmentId: number
  onClose: () => void
  onCreated: (employee: EmployeeListItem) => void
}

export function EmployeeCreateModal({ establishmentId, onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [created, setCreated] = useState<CreatedEmployee | null>(null)
  const [usedPassword, setUsedPassword] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, submitting])

  function validate(): FieldErrors {
    const errs: FieldErrors = {}
    const trimName = name.trim()
    if (!trimName || trimName.length < 3) errs.name = 'O nome deve ter pelo menos 3 caracteres.'
    else if (trimName.length > 80) errs.name = 'O nome deve ter no máximo 80 caracteres.'

    const digits = phoneDigits(phone)
    if (!PHONE_RE.test(digits)) errs.phone = 'Telefone deve ter entre 10 e 11 dígitos no formato BR.'

    const trimEmail = email.trim()
    if (trimEmail && !EMAIL_RE.test(trimEmail)) errs.email = 'Formato de e-mail inválido.'

    if (password.length < 8) errs.password = 'A senha deve ter pelo menos 8 caracteres.'
    else if (password.length > 72) errs.password = 'A senha deve ter no máximo 72 caracteres.'

    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    setApiError(null)

    const trimEmail = email.trim()
    const body = {
      name: name.trim(),
      phone: phoneDigits(phone),
      password,
      ...(trimEmail ? { email: trimEmail } : {}),
    }

    try {
      const result = await createEmployee(establishmentId, body)
      setCreated(result)
      setUsedPassword(password)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          const msg = err.message.toLowerCase()
          if (msg.includes('e-mail') || msg.includes('email')) {
            setFieldErrors({ email: err.message })
          } else if (msg.includes('telefone') || msg.includes('phone')) {
            setFieldErrors({ phone: err.message })
          } else {
            setApiError(err.message)
          }
        } else if (err.status === 403) {
          setApiError('Sem permissão. Apenas o dono do estabelecimento pode criar funcionários.')
        } else {
          setApiError(err.message)
        }
      } else {
        setApiError(err instanceof Error ? err.message : 'Erro ao criar funcionário')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function clearFieldError(field: keyof FieldErrors) {
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function handleCloseSuccess() {
    if (created) {
      onCreated({
        employeeLinkId: 0,
        userId: created.id,
        name: created.name,
        phone: created.phone,
        email: created.email,
        active: true,
        linkedAt: created.createdAt,
        userCreatedAt: created.createdAt,
      })
    }
    onClose()
  }

  return (
    <div className="eq-modal-overlay" onClick={!submitting ? handleCloseSuccess : undefined}>
      <div
        className="eq-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Criar funcionário"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="eq-modal__close"
          onClick={handleCloseSuccess}
          disabled={submitting}
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        {created ? (
          <>
            <div className="eq-modal__header">
              <span className="eq-modal__icon eq-modal__icon--success" aria-hidden>
                <Check size={20} strokeWidth={2.5} />
              </span>
              <h2 className="eq-modal__title">Funcionário criado</h2>
            </div>

            <div className="eq-modal__success-rows">
              <div className="eq-modal__row">
                <span className="eq-modal__row-label">Nome</span>
                <span className="eq-modal__row-value">{created.name}</span>
              </div>
              <div className="eq-modal__row">
                <span className="eq-modal__row-label">Telefone</span>
                <span className="eq-modal__row-value">{formatPhoneBr(created.phone)}</span>
              </div>
              {created.email ? (
                <div className="eq-modal__row">
                  <span className="eq-modal__row-label">E-mail</span>
                  <span className="eq-modal__row-value">{created.email}</span>
                </div>
              ) : null}
              <div className="eq-modal__row">
                <span className="eq-modal__row-label">Senha definida</span>
                <span className="eq-modal__row-value eq-modal__row-value--mono">
                  {usedPassword}
                </span>
              </div>
            </div>

            <p className="eq-modal__pw-hint">
              Repasse a senha ao funcionário. Ela não será exibida novamente após fechar.
            </p>

            <div className="eq-modal__actions">
              <button
                type="button"
                className="eq-btn eq-btn--primary"
                onClick={handleCloseSuccess}
              >
                Fechar
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="eq-modal__header">
              <h2 className="eq-modal__title">Adicionar funcionário</h2>
              <p className="eq-modal__desc">
                O funcionário poderá acessar o painel de gestão após o login.
              </p>
            </div>

            {apiError ? <div className="eq-modal__error">{apiError}</div> : null}

            <form onSubmit={(e) => void handleSubmit(e)} noValidate autoComplete="off">
              <div className="eq-modal__fields">
                <div className="eq-modal__field">
                  <label htmlFor="ecm-name" className="eq-modal__label">
                    Nome <span className="eq-modal__req">*</span>
                  </label>
                  <input
                    id="ecm-name"
                    type="text"
                    className={`eq-input${fieldErrors.name ? ' eq-input--err' : ''}`}
                    value={name}
                    onChange={(e) => { setName(e.target.value); clearFieldError('name') }}
                    placeholder="Nome completo"
                    maxLength={80}
                    disabled={submitting}
                    autoComplete="off"
                    autoFocus
                  />
                  {fieldErrors.name ? <p className="eq-field-err">{fieldErrors.name}</p> : null}
                </div>

                <div className="eq-modal__field">
                  <label htmlFor="ecm-phone" className="eq-modal__label">
                    Telefone <span className="eq-modal__req">*</span>
                  </label>
                  <input
                    id="ecm-phone"
                    type="tel"
                    className={`eq-input${fieldErrors.phone ? ' eq-input--err' : ''}`}
                    value={phone}
                    onChange={(e) => { setPhone(formatPhoneBr(e.target.value)); clearFieldError('phone') }}
                    placeholder="(51) 99888-7766"
                    disabled={submitting}
                    autoComplete="off"
                  />
                  {fieldErrors.phone ? <p className="eq-field-err">{fieldErrors.phone}</p> : null}
                </div>

                <div className="eq-modal__field">
                  <label htmlFor="ecm-email" className="eq-modal__label">
                    E-mail <span className="eq-modal__opt">(opcional)</span>
                  </label>
                  <input
                    id="ecm-email"
                    type="email"
                    className={`eq-input${fieldErrors.email ? ' eq-input--err' : ''}`}
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearFieldError('email') }}
                    placeholder="joao@exemplo.com"
                    disabled={submitting}
                    autoComplete="off"
                  />
                  {fieldErrors.email ? <p className="eq-field-err">{fieldErrors.email}</p> : null}
                </div>

                <div className="eq-modal__field">
                  <label htmlFor="ecm-pw" className="eq-modal__label">
                    Senha <span className="eq-modal__req">*</span>
                  </label>
                  <div className="eq-pw-wrap">
                    <input
                      id="ecm-pw"
                      type={showPw ? 'text' : 'password'}
                      className={`eq-input eq-input--pw${fieldErrors.password ? ' eq-input--err' : ''}`}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); clearFieldError('password') }}
                      placeholder="Mínimo 8 caracteres"
                      maxLength={72}
                      disabled={submitting}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="eq-pw-toggle"
                      onClick={() => setShowPw(!showPw)}
                      aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {fieldErrors.password ? (
                    <p className="eq-field-err">{fieldErrors.password}</p>
                  ) : null}
                </div>
              </div>

              <div className="eq-modal__actions">
                <button
                  type="button"
                  className="eq-btn eq-btn--ghost"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button type="submit" className="eq-btn eq-btn--primary" disabled={submitting}>
                  {submitting ? 'A criar…' : 'Criar funcionário'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
