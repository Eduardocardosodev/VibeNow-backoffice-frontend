import { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface Props {
  employeeName: string
  loading: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDeleteDialog({ employeeName, loading, onConfirm, onCancel }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onCancel, loading])

  return (
    <div className="eq-modal-overlay" onClick={!loading ? onCancel : undefined}>
      <div
        className="eq-modal eq-modal--sm"
        role="alertdialog"
        aria-modal="true"
        aria-label="Confirmar remoção"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="eq-modal__close"
          onClick={onCancel}
          disabled={loading}
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        <div className="eq-modal__header">
          <span className="eq-modal__icon eq-modal__icon--danger" aria-hidden>
            <AlertTriangle size={20} />
          </span>
          <h2 className="eq-modal__title">Remover funcionário</h2>
        </div>

        <p className="eq-modal__body-text">
          Tem certeza que deseja remover <strong>{employeeName}</strong>? Esta ação é permanente
          — o funcionário perderá o acesso ao estabelecimento e precisará ser cadastrado
          novamente.
        </p>

        <div className="eq-modal__actions">
          <button
            type="button"
            className="eq-btn eq-btn--ghost"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="eq-btn eq-btn--danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'A remover…' : 'Remover'}
          </button>
        </div>
      </div>
    </div>
  )
}
