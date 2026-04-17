import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getApiBaseUrl } from '@/lib/apiBaseUrl'
import { useAuth } from '@/contexts'
import '@/styles/authLayout.css'

export function LoginScreen() {
  const { login, error, clearError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const apiMissing = !getApiBaseUrl()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    clearError()
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch {
      /* erro já está no contexto */
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1 className="auth-title">Entrar</h1>
        <p className="auth-subtitle">
          Portal do estabelecimento VibeNow. Utilize o e-mail e palavra-passe da sua conta de dono ou
          equipa.
        </p>

        {error ? <p className="auth-error">{error}</p> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="login-email">
              E-mail
            </label>
            <input
              id="login-email"
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
            <label className="auth-label" htmlFor="login-password">
              Palavra-passe
            </label>
            <input
              id="login-password"
              className="auth-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
              disabled={apiMissing || submitting}
            />
          </div>
          <button
            type="submit"
            className="auth-primary-btn"
            disabled={apiMissing || submitting}
          >
            {submitting ? 'A entrar…' : 'Entrar'}
          </button>
        </form>

        <div className="auth-footer">
          Novo na plataforma?{' '}
          <Link to="/cadastro" state={location.state}>
            Registar estabelecimento
          </Link>
        </div>
      </div>
    </div>
  )
}
