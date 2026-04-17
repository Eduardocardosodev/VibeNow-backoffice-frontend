import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { MenuItemPhotoUpload } from '@/components/menu/MenuItemPhotoUpload'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { addMenuItem, patchMenuItem } from '@/services/menuApi'
import { MENU_ITEM_TYPE_OPTIONS, type MenuItem } from '@/types/menu'
import { ApiError } from '@/lib/apiClient'

export interface MenuItemEditorProps {
  open: boolean
  menuId: number
  /** Edição: item existente. Criação: null. */
  item: MenuItem | null
  /** Preencher formulário novo a partir de cópia (duplicar). */
  duplicateFrom: MenuItem | null
  onClose: () => void
  onSaved: () => void
}

const emptyForm = () => ({
  name: '',
  description: '',
  price: '',
  type: 'ALCOHOLIC_DRINK',
})

export function MenuItemEditor({
  open,
  menuId,
  item,
  duplicateFrom,
  onClose,
  onSaved,
}: MenuItemEditorProps) {
  const [form, setForm] = useState(emptyForm)
  const [basePhotoUrl, setBasePhotoUrl] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const blobPreview = useObjectUrl(photoFile)
  const previewSrc = blobPreview ?? (!photoRemoved ? basePhotoUrl : null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    setError(null)
    if (item) {
      setBasePhotoUrl(item.photoMenuItem)
      setForm({
        name: item.name,
        description: item.description ?? '',
        price: String(item.price),
        type: item.type,
      })
    } else if (duplicateFrom) {
      setBasePhotoUrl(duplicateFrom.photoMenuItem)
      setForm({
        name: duplicateFrom.name,
        description: duplicateFrom.description ?? '',
        price: String(duplicateFrom.price),
        type: duplicateFrom.type,
      })
    } else {
      setBasePhotoUrl(null)
      setForm(emptyForm())
    }
    setPhotoFile(null)
    setPhotoRemoved(false)
  }, [open, item, duplicateFrom])

  if (!open) return null

  const isEdit = item != null
  const priceNum = Number.parseFloat(form.price.replace(',', '.'))
  const canSave =
    form.name.trim().length > 0 &&
    form.type.length > 0 &&
    !Number.isNaN(priceNum) &&
    priceNum >= 0 &&
    !saving

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: priceNum,
        type: form.type,
        photo: photoFile ?? undefined,
        clearPhoto: isEdit && photoRemoved && !photoFile,
        photoMenuItem:
          !photoFile && !photoRemoved && !isEdit && basePhotoUrl
            ? basePhotoUrl
            : undefined,
      }
      if (isEdit && item) {
        await patchMenuItem(menuId, item.id, payload)
      } else {
        await addMenuItem(menuId, payload)
      }
      onSaved()
      onClose()
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Erro ao guardar'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="menu-modal" role="dialog" aria-modal="true" aria-labelledby="menu-item-editor-title">
      <button type="button" className="menu-modal__backdrop" aria-label="Fechar" onClick={onClose} />
      <div className="menu-modal__panel">
        <div className="menu-modal__head">
          <h2 id="menu-item-editor-title" className="menu-modal__title">
            {isEdit ? 'Editar item' : 'Novo item'}
          </h2>
          <button type="button" className="menu-modal__close" onClick={onClose} aria-label="Fechar">
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        <form className="menu-modal__form" onSubmit={handleSubmit}>
          {error ? <p className="menu-modal__error">{error}</p> : null}
          <div className="menu-field">
            <label htmlFor="mi-name">Nome</label>
            <input
              id="mi-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              maxLength={120}
            />
          </div>
          <div className="menu-field">
            <label htmlFor="mi-desc">Descrição</label>
            <textarea
              id="mi-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              maxLength={500}
            />
          </div>
          <div className="menu-field">
            <label htmlFor="mi-price">Preço (R$)</label>
            <input
              id="mi-price"
              inputMode="decimal"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="0"
              required
            />
          </div>
          <div className="menu-field">
            <label htmlFor="mi-type">Categoria (tipo)</label>
            <select
              id="mi-type"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              {MENU_ITEM_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="menu-field">
            <label htmlFor="mi-photo">Foto do item</label>
            <MenuItemPhotoUpload
              id="mi-photo"
              previewSrc={previewSrc}
              onFileSelected={(f) => {
                setPhotoFile(f)
                setPhotoRemoved(false)
              }}
              onClear={() => {
                setPhotoFile(null)
                setPhotoRemoved(true)
              }}
              disabled={saving}
            />
          </div>
          <div className="menu-modal__actions">
            <button type="button" className="menu-btn menu-btn--ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="menu-btn menu-btn--primary" disabled={!canSave}>
              {saving ? 'A guardar…' : isEdit ? 'Guardar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
