import { useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'

const MAX_BYTES = 5 * 1024 * 1024

export interface MenuItemPhotoUploadProps {
  /** URL do servidor ou `blob:` da pré-visualização local */
  previewSrc: string | null
  onFileSelected: (file: File) => void
  onClear: () => void
  disabled?: boolean
  id?: string
  /** Texto de ajuda por baixo dos botões (ex.: outra rota de upload). */
  hint?: string
}

export function MenuItemPhotoUpload({
  previewSrc,
  onFileSelected,
  onClear,
  disabled = false,
  id = 'menu-item-photo',
}: MenuItemPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setLocalError(null)
    if (!file.type.startsWith('image/')) {
      setLocalError('Selecione um ficheiro de imagem (JPG, PNG, etc.).')
      return
    }
    if (file.size > MAX_BYTES) {
      setLocalError('A imagem deve ter no máximo 5 MB.')
      return
    }
    onFileSelected(file)
  }

  return (
    <div className="menu-photo-upload">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        className="menu-photo-upload__input"
        onChange={handleFile}
        disabled={disabled}
        aria-label="Escolher imagem do item"
      />
      {previewSrc ? (
        <div className="menu-photo-upload__preview-wrap">
          <img className="menu-photo-upload__preview" src={previewSrc} alt="" />
        </div>
      ) : (
        <div className="menu-photo-upload__placeholder" aria-hidden>
          Sem imagem
        </div>
      )}
      <div className="menu-photo-upload__actions">
        <button
          type="button"
          className="menu-photo-upload__btn"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          <ImagePlus size={18} strokeWidth={2} aria-hidden />
          {previewSrc ? 'Alterar imagem' : 'Escolher imagem'}
        </button>
        {previewSrc ? (
          <button
            type="button"
            className="menu-photo-upload__btn menu-photo-upload__btn--ghost"
            onClick={() => {
              setLocalError(null)
              onClear()
            }}
            disabled={disabled}
            aria-label="Remover imagem"
          >
            <Trash2 size={18} strokeWidth={2} aria-hidden />
            Remover
          </button>
        ) : null}
      </div>
      {localError ? <p className="menu-photo-upload__error">{localError}</p> : null}
    </div>
  )
}
