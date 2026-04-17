import type { Quote } from '@/types/quote'
import { quoteLifecycleStatus } from '@/types/quote'
import { quotePreview } from '@/utils/quotePreview'

interface QuoteMapPinPreviewProps {
  /** Texto já truncado com quotePreview (ou string vazia para não mostrar bloco) */
  previewText: string
  variant: 'live' | 'draft'
}

/**
 * Pin redondo no mapa + bloco de preview abaixo da bolinha (como no app).
 */
function QuoteMapPinPreview({ previewText, variant }: QuoteMapPinPreviewProps) {
  const hasText = previewText.length > 0
  const isDraft = variant === 'draft'

  return (
    <div
      className={`quote-map-pin${isDraft ? ' quote-map-pin--draft' : ''}`}
      aria-label={isDraft ? 'Pré-visualização no mapa (rascunho)' : 'Citação ativa no mapa'}
    >
      <div className="quote-map-pin__marker" aria-hidden>
        <span className="quote-map-pin__ball" />
        <span className="quote-map-pin__stem" />
      </div>
      {hasText ? (
        <div className="quote-map-pin__bubble">
          <p className="quote-map-pin__bubble-text">{previewText}</p>
        </div>
      ) : null}
    </div>
  )
}

interface QuotePreviewDeviceProps {
  activeQuotes: Quote[]
  draftText: string
}

function pickPrimaryActive(quotes: Quote[], now: Date): Quote | null {
  const actives = quotes.filter((q) => quoteLifecycleStatus(q, now) === 'active')
  if (actives.length === 0) return null
  return actives[0]
}

/** Moldura tipo telemóvel com mapa, pin e texto truncado (quotePreview, 40 chars). */
export function QuotePreviewDevice({ activeQuotes, draftText }: QuotePreviewDeviceProps) {
  const now = new Date()
  const primaryActive = pickPrimaryActive(activeQuotes, now)
  const draftTrimmed = draftText.trim()

  const showDraft = draftTrimmed.length > 0
  const sourceText = showDraft ? draftTrimmed : (primaryActive?.text ?? '')
  const truncated = sourceText ? quotePreview(sourceText) : ''
  const variant: 'live' | 'draft' = showDraft ? 'draft' : 'live'
  const showEmpty = !truncated && !showDraft && !primaryActive

  return (
    <div className="quote-preview-device" aria-label="Pré-visualização no telemóvel">
      <div className="quote-preview-device__notch" aria-hidden />
      <div className="quote-preview-device__screen">
        <div className="quote-preview-device__status">
          <span className="quote-preview-device__dot" />
          <span>Mapa</span>
        </div>
        <div className="quote-map-preview">
          <div className="quote-map-preview__surface" aria-hidden>
            <span className="quote-map-preview__road quote-map-preview__road--1" />
            <span className="quote-map-preview__road quote-map-preview__road--2" />
            <span className="quote-map-preview__road quote-map-preview__road--3" />
            <span className="quote-map-preview__block" />
          </div>
          <div className="quote-map-preview__anchor">
            {truncated ? (
              <QuoteMapPinPreview previewText={truncated} variant={variant} />
            ) : (
              <div className="quote-map-pin quote-map-pin--no-text" aria-hidden>
                <div className="quote-map-pin__marker">
                  <span className="quote-map-pin__ball" />
                  <span className="quote-map-pin__stem" />
                </div>
              </div>
            )}
          </div>
        </div>
        {showEmpty ? (
          <p className="quote-preview-device__hint">Sem citação ativa — o pin aparece sem texto.</p>
        ) : showDraft && primaryActive ? (
          <p className="quote-preview-device__hint">
            Rascunho em destaque; após publicar, o app usa a citação ativa no pin.
          </p>
        ) : null}
      </div>
    </div>
  )
}
