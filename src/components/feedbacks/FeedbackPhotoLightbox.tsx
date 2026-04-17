import { useEffect } from 'react'
import { X } from 'lucide-react'

interface FeedbackPhotoLightboxProps {
  url: string
  alt?: string
  onClose: () => void
}

export function FeedbackPhotoLightbox({ url, alt = 'Foto do feedback', onClose }: FeedbackPhotoLightboxProps) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      className="fb-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Visualização da foto"
      onClick={onClose}
    >
      <button type="button" className="fb-lightbox__close" onClick={onClose} aria-label="Fechar">
        <X size={22} strokeWidth={2} />
      </button>
      <div className="fb-lightbox__frame" onClick={(e) => e.stopPropagation()}>
        <img className="fb-lightbox__img" src={url} alt={alt} />
      </div>
    </div>
  )
}
