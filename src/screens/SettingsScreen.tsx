import { useCallback, useEffect, useMemo, useState } from 'react'
import { Gift } from 'lucide-react'
import { useAuth } from '@/contexts'
import { ApiError } from '@/lib/apiClient'
import {
  fetchFeedbackReward,
  patchFeedbackReward,
} from '@/services/feedbackRewardApi'
import type { FeedbackRewardConfig, PatchFeedbackRewardBody } from '@/types/feedbackReward'
import '@/styles/settings.css'

const MSG_MAX = 500
const DEFAULT_MSG_PLACEHOLDER =
  'Obrigado pelo feedback! Consulte a equipe do local para retirar sua recompensa.'

export function SettingsScreen() {
  const { access, activeEstablishmentId, selectEstablishment } = useAuth()

  const [config, setConfig] = useState<FeedbackRewardConfig | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

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
      setConfig(null)
      setLoading(false)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const cfg = await fetchFeedbackReward(activeEstablishmentId)
      setConfig(cfg)
      setEnabled(cfg.enabled)
      setMessage(cfg.message ?? '')
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setError('Apenas o dono do estabelecimento pode gerir esta configuração.')
      } else {
        const msg =
          e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Erro ao carregar configuração'
        setError(msg)
      }
      setConfig(null)
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

  const isDirty = useMemo(() => {
    if (!config) return false
    if (enabled !== config.enabled) return true
    const current = message.trim() || null
    const saved = config.message ?? null
    return current !== saved
  }, [config, enabled, message])

  const msgOverLimit = message.length > MSG_MAX
  const canSave = isDirty && !saving && !msgOverLimit

  async function handleSave() {
    if (!canSave || activeEstablishmentId == null || !config) return
    setSaving(true)
    setError(null)
    setToast(null)

    const body: PatchFeedbackRewardBody = {}
    if (enabled !== config.enabled) {
      body.enabled = enabled
    }
    const currentMsg = message.trim() || null
    const savedMsg = config.message ?? null
    if (currentMsg !== savedMsg) {
      body.message = currentMsg
    }

    try {
      const updated = await patchFeedbackReward(activeEstablishmentId, body)
      setConfig(updated)
      setEnabled(updated.enabled)
      setMessage(updated.message ?? '')
      setToast('Configuração guardada com sucesso.')
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setError('Sem permissão. Apenas o dono pode alterar esta configuração.')
      } else {
        const msg =
          e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Erro ao guardar'
        setError(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  function handleDiscard() {
    if (!config) return
    setEnabled(config.enabled)
    setMessage(config.message ?? '')
    setError(null)
  }

  const previewText = message.trim() || DEFAULT_MSG_PLACEHOLDER

  if (activeEstablishmentId == null) {
    return (
      <div className="settings-page">
        <div className="settings-page__inner">
          <header className="settings-page__header">
            <div>
              <p className="settings-page__eyebrow">Configurações</p>
              <h1 className="settings-page__title">Definições</h1>
              <p className="settings-page__sub">
                Selecione um estabelecimento para gerir as configurações.
              </p>
            </div>
          </header>
          <p className="settings-page__empty">Nenhum estabelecimento disponível nesta conta.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-page">
      <div className="settings-page__inner">
        <header className="settings-page__header">
          <div>
            <p className="settings-page__eyebrow">Configurações</p>
            <h1 className="settings-page__title">Definições</h1>
            <p className="settings-page__sub">
              Gerencie as configurações do seu estabelecimento. As alterações aplicam-se
              imediatamente após guardar.
            </p>
          </div>
          {establishmentOptions.length > 1 ? (
            <>
              <label className="visually-hidden" htmlFor="settings-establishment">
                Estabelecimento
              </label>
              <select
                id="settings-establishment"
                className="settings-page__select"
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
          <div className="settings-toast" role="status" aria-live="polite">
            {toast}
          </div>
        ) : null}

        {loading ? <p className="settings-page__loading">A carregar…</p> : null}

        {!loading ? (
          <>
            {error ? <div className="settings-page__error">{error}</div> : null}

            {config ? (
              <div className="settings-grid">
                <section className="settings-card" aria-labelledby="reward-title">
                  <div className="settings-card__head">
                    <div className="settings-card__head-text">
                      <div className="settings-card__icon-row">
                        <span className="settings-card__icon" aria-hidden>
                          <Gift size={20} strokeWidth={2} />
                        </span>
                        <h2 id="reward-title" className="settings-card__title">
                          Feedback Reward
                        </h2>
                      </div>
                      <p className="settings-card__desc">
                        Recompensa exibida ao usuário logo após enviar um feedback. Quando ativa,
                        o app mostra uma tela com a mensagem configurada abaixo.
                      </p>
                    </div>
                    <label className="settings-switch" aria-label="Ativar ou desativar feedback reward">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => setEnabled(e.target.checked)}
                        disabled={saving}
                      />
                      <span className="settings-switch__track" aria-hidden />
                      <span className="settings-switch__status">
                        {enabled ? 'Ativo' : 'Desativado'}
                      </span>
                    </label>
                  </div>

                  <div className={`settings-reward-body${!enabled ? ' settings-reward-body--off' : ''}`}>
                    <div className="settings-field">
                      <label htmlFor="reward-msg" className="settings-field__label">
                        Mensagem personalizada
                      </label>
                      <textarea
                        id="reward-msg"
                        className="settings-field__textarea"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={DEFAULT_MSG_PLACEHOLDER}
                        maxLength={MSG_MAX}
                        rows={4}
                        disabled={saving}
                      />
                      <div className="settings-field__footer">
                        <p className="settings-field__hint">
                          {message.trim()
                            ? 'Mensagem customizada será exibida ao usuário.'
                            : 'Se vazio, o sistema usará a mensagem padrão.'}
                        </p>
                        <span
                          className={`settings-field__counter${
                            msgOverLimit
                              ? ' settings-field__counter--err'
                              : message.length > MSG_MAX - 50
                                ? ' settings-field__counter--warn'
                                : ''
                          }`}
                          aria-live="polite"
                        >
                          {message.length}/{MSG_MAX}
                        </span>
                      </div>
                    </div>

                    {!enabled ? (
                      <p className="settings-reward-off-hint">
                        A recompensa está desativada. O usuário não verá nenhuma mensagem após o
                        feedback. Ative o toggle acima para configurar.
                      </p>
                    ) : null}
                  </div>

                  <div className="settings-card__actions">
                    {isDirty ? (
                      <button
                        type="button"
                        className="settings-btn settings-btn--ghost"
                        onClick={handleDiscard}
                        disabled={saving}
                      >
                        Descartar
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="settings-btn settings-btn--primary"
                      onClick={() => void handleSave()}
                      disabled={!canSave}
                    >
                      {saving ? 'A guardar…' : 'Guardar alterações'}
                    </button>
                  </div>
                </section>

                <aside className="settings-preview" aria-label="Pré-visualização da recompensa">
                  <p className="settings-preview__label">Preview no app</p>
                  <div className="settings-preview__device">
                    <div className="settings-preview__notch" aria-hidden />
                    <div className="settings-preview__screen">
                      <div className="settings-preview__status-bar">
                        <span className="settings-preview__dot" />
                        <span>Feedback enviado</span>
                      </div>
                      {enabled ? (
                        <div className="settings-preview__reward">
                          <div className="settings-preview__reward-icon" aria-hidden>
                            <Gift size={32} strokeWidth={1.5} />
                          </div>
                          <h3 className="settings-preview__reward-title">Recompensa</h3>
                          <p className="settings-preview__reward-msg">{previewText}</p>
                        </div>
                      ) : (
                        <div className="settings-preview__off">
                          <p className="settings-preview__off-text">
                            Recompensa desativada — nada é exibido após o feedback.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </aside>
              </div>
            ) : null}

          </>
        ) : null}
      </div>
    </div>
  )
}
