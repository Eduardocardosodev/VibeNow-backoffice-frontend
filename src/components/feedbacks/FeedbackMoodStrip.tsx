import type { FeedbackSentiment } from '@/types/establishmentFeedback'

export interface MoodCounts {
  positive: number
  neutral: number
  negative: number
}

interface FeedbackMoodStripProps {
  counts: MoodCounts
  /** Texto curto abaixo da barra (ex.: “Nesta página” / “Atualizado há …”) */
  caption?: string
}

const LABELS: Record<FeedbackSentiment, string> = {
  positive: 'Positivo',
  neutral: 'Neutro',
  negative: 'Negativo',
}

export function FeedbackMoodStrip({ counts, caption }: FeedbackMoodStripProps) {
  const total = counts.positive + counts.neutral + counts.negative
  const p = total > 0 ? (counts.positive / total) * 100 : 0
  const n = total > 0 ? (counts.neutral / total) * 100 : 0
  const neg = total > 0 ? (counts.negative / total) * 100 : 0

  return (
    <div className="fb-mood">
      <div className="fb-mood__bar" role="img" aria-label="Distribuição de humor na amostra atual">
        <div
          className="fb-mood__seg fb-mood__seg--positive"
          style={{ width: `${p}%` }}
          title={`${LABELS.positive}: ${counts.positive}`}
        />
        <div
          className="fb-mood__seg fb-mood__seg--neutral"
          style={{ width: `${n}%` }}
          title={`${LABELS.neutral}: ${counts.neutral}`}
        />
        <div
          className="fb-mood__seg fb-mood__seg--negative"
          style={{ width: `${neg}%` }}
          title={`${LABELS.negative}: ${counts.negative}`}
        />
      </div>
      <ul className="fb-mood__legend">
        <li className="fb-mood__legend-item">
          <span className="fb-mood__dot fb-mood__dot--positive" />
          {LABELS.positive}: <strong>{counts.positive}</strong>
        </li>
        <li className="fb-mood__legend-item">
          <span className="fb-mood__dot fb-mood__dot--neutral" />
          {LABELS.neutral}: <strong>{counts.neutral}</strong>
        </li>
        <li className="fb-mood__legend-item">
          <span className="fb-mood__dot fb-mood__dot--negative" />
          {LABELS.negative}: <strong>{counts.negative}</strong>
        </li>
      </ul>
      {caption ? <p className="fb-mood__caption">{caption}</p> : null}
    </div>
  )
}
