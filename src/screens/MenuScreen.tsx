import { useCallback, useEffect, useMemo, useState } from 'react'
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts'
import { MenuItemEditor } from '@/components/menu/MenuItemEditor'
import { MenuItemPhotoUpload } from '@/components/menu/MenuItemPhotoUpload'
import { MenuPreviewPanel } from '@/components/menu/MenuPreviewPanel'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { ApiError } from '@/lib/apiClient'
import {
  addMenuItem,
  createMenu,
  deleteMenu,
  deleteMenuItem,
  fetchMenuByEstablishment,
  fetchMenuById,
} from '@/services/menuApi'
import type { Menu, MenuItem } from '@/types/menu'
import { MENU_ITEM_TYPE_OPTIONS, menuItemTypeLabel } from '@/types/menu'
import '@/styles/menu.css'

function formatBrl(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function orderedTypesFromItems(items: MenuItem[]): string[] {
  const seen = new Set(items.map((i) => i.type))
  const ordered: string[] = MENU_ITEM_TYPE_OPTIONS.map((o) => o.value).filter((t) => seen.has(t))
  const extra = [...seen].filter((t) => !ordered.includes(t))
  extra.sort((a, b) => a.localeCompare(b, 'pt'))
  return [...ordered, ...extra]
}

export function MenuScreen() {
  const { access, activeEstablishmentId, selectEstablishment } = useAuth()

  const [menu, setMenu] = useState<Menu | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [activeTab, setActiveTab] = useState<string>('ALL')
  const [soldOutIds, setSoldOutIds] = useState<Set<number>>(() => new Set())

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [duplicateFrom, setDuplicateFrom] = useState<MenuItem | null>(null)

  const [setupName, setSetupName] = useState('')
  const [setupDesc, setSetupDesc] = useState('')
  const [setupPrice, setSetupPrice] = useState('')
  const [setupType, setSetupType] = useState<string>('ALCOHOLIC_DRINK')
  const [setupPhotoFile, setSetupPhotoFile] = useState<File | null>(null)
  const setupPhotoPreview = useObjectUrl(setupPhotoFile)

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
      setMenu(null)
      setLoading(false)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const m = await fetchMenuByEstablishment(activeEstablishmentId)
      setMenu(m)
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Erro ao carregar cardápio'
      setError(msg)
      setMenu(null)
    } finally {
      setLoading(false)
    }
  }, [activeEstablishmentId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setActiveTab('ALL')
    setSoldOutIds(new Set())
  }, [menu?.id])

  const tabTypes = useMemo(() => orderedTypesFromItems(menu?.items ?? []), [menu?.items])

  const filteredItems = useMemo(() => {
    const items = menu?.items ?? []
    if (activeTab === 'ALL') return items
    return items.filter((i) => i.type === activeTab)
  }, [menu?.items, activeTab])

  function openNew() {
    setEditingItem(null)
    setDuplicateFrom(null)
    setEditorOpen(true)
  }

  function openEdit(it: MenuItem) {
    setDuplicateFrom(null)
    setEditingItem(it)
    setEditorOpen(true)
  }

  function openDuplicate(it: MenuItem) {
    setEditingItem(null)
    setDuplicateFrom(it)
    setEditorOpen(true)
  }

  function closeEditor() {
    setEditorOpen(false)
    setEditingItem(null)
    setDuplicateFrom(null)
  }

  async function handleCreateMenuEmpty() {
    if (activeEstablishmentId == null) return
    setBusy(true)
    setError(null)
    try {
      const m = await createMenu(activeEstablishmentId, [])
      setMenu(m)
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Erro ao criar cardápio'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateMenuWithFirstItem() {
    if (activeEstablishmentId == null) return
    const priceNum = Number.parseFloat(setupPrice.replace(',', '.'))
    if (!setupName.trim()) {
      setError('Indique o nome do primeiro item.')
      return
    }
    if (setupType.length === 0) {
      setError('Escolha a categoria.')
      return
    }
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setError('Indique um preço válido (≥ 0).')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const m = await createMenu(activeEstablishmentId, [])
      await addMenuItem(m.id, {
        name: setupName.trim(),
        description: setupDesc.trim() || null,
        price: priceNum,
        type: setupType,
        photo: setupPhotoFile ?? undefined,
      })
      const full = await fetchMenuById(m.id)
      setMenu(full)
      setSetupName('')
      setSetupDesc('')
      setSetupPrice('')
      setSetupType('ALCOHOLIC_DRINK')
      setSetupPhotoFile(null)
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Erro ao criar cardápio'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteMenu() {
    if (!menu) return
    if (!window.confirm('Eliminar todo o cardápio e itens? Esta ação não pode ser anulada.')) return
    setBusy(true)
    setError(null)
    try {
      await deleteMenu(menu.id)
      setMenu(null)
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Erro ao eliminar cardápio'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteItem(it: MenuItem) {
    if (!menu) return
    if (!window.confirm(`Eliminar “${it.name}”?`)) return
    setBusy(true)
    setError(null)
    try {
      await deleteMenuItem(menu.id, it.id)
      setSoldOutIds((prev) => {
        const n = new Set(prev)
        n.delete(it.id)
        return n
      })
      await load()
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Erro ao eliminar item'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  function toggleSoldOut(id: number) {
    setSoldOutIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  if (activeEstablishmentId == null) {
    return (
      <div className="menu-page">
        <div className="menu-page__inner">
          <header className="menu-page__header">
            <div>
              <p className="menu-page__eyebrow">Operação</p>
              <h1 className="menu-page__title">Cardápio</h1>
              <p className="menu-page__sub">Selecione um estabelecimento para gerir o menu.</p>
            </div>
          </header>
          <p className="menu-page__empty">Nenhum estabelecimento disponível nesta conta.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="menu-page">
      <div className="menu-page__inner">
        <header className="menu-page__header">
          <div>
            <p className="menu-page__eyebrow">Operação</p>
            <h1 className="menu-page__title">Gestão de cardápio</h1>
            <p className="menu-page__sub">
              Itens com URL de foto, categorias por tipo, edição rápida e preview. Sem upload de
              ficheiros nem stock persistente no servidor.
            </p>
          </div>
          {establishmentOptions.length > 1 ? (
            <>
              <label className="visually-hidden" htmlFor="menu-establishment">
                Estabelecimento
              </label>
              <select
                id="menu-establishment"
                className="menu-page__select"
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

        {error ? <div className="menu-page__error">{error}</div> : null}

        <div className="menu-page__toolbar">
          {/* <button
            type="button"
            className="menu-btn menu-btn--ghost"
            onClick={() => void load()}
            disabled={loading || busy}
          >
            <RefreshCw size={16} strokeWidth={2} aria-hidden />
            Atualizar
          </button> */}
          {menu ? (
            <>
              <button
                type="button"
                className="menu-btn menu-btn--primary"
                onClick={openNew}
                disabled={busy}
              >
                <Plus size={16} strokeWidth={2} aria-hidden />
                Adicionar item
              </button>
              <button
                type="button"
                className="menu-btn menu-btn--danger"
                onClick={() => void handleDeleteMenu()}
                disabled={busy}
              >
                <Trash2 size={16} strokeWidth={2} aria-hidden />
                Eliminar cardápio
              </button>
            </>
          ) : null}
        </div>

        {loading ? <p className="menu-page__loading">A carregar…</p> : null}

        {!loading && !menu ? (
          <div className="menu-page__grid menu-page__grid--setup">
            <div className="menu-create-panel">
              <h2 className="menu-create-panel__title">Criar cardápio</h2>
              <p className="menu-create-panel__lead">
                Preencha o primeiro produto abaixo e confirme, ou comece com um cardápio vazio e
                adicione itens depois.
              </p>
              <div className="menu-field">
                <label htmlFor="setup-name">Nome do item</label>
                <input
                  id="setup-name"
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  placeholder="Ex.: Gin tónica"
                  maxLength={120}
                  disabled={busy}
                />
              </div>
              <div className="menu-field">
                <label htmlFor="setup-desc">Descrição</label>
                <textarea
                  id="setup-desc"
                  value={setupDesc}
                  onChange={(e) => setSetupDesc(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Opcional"
                  disabled={busy}
                />
              </div>
              <div className="menu-field">
                <label htmlFor="setup-price">Preço (R$)</label>
                <input
                  id="setup-price"
                  inputMode="decimal"
                  value={setupPrice}
                  onChange={(e) => setSetupPrice(e.target.value)}
                  placeholder="0"
                  disabled={busy}
                />
              </div>
              <div className="menu-field">
                <label htmlFor="setup-type">Categoria</label>
                <select
                  id="setup-type"
                  value={setupType}
                  onChange={(e) => setSetupType(e.target.value)}
                  disabled={busy}
                >
                  {MENU_ITEM_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="menu-field">
                <label htmlFor="setup-photo">Foto (opcional)</label>
                <MenuItemPhotoUpload
                  id="setup-photo"
                  previewSrc={setupPhotoPreview}
                  onFileSelected={(f) => setSetupPhotoFile(f)}
                  onClear={() => setSetupPhotoFile(null)}
                  disabled={busy}
                />
              </div>
              <div className="menu-create-panel__actions">
                <button
                  type="button"
                  className="menu-btn menu-btn--primary"
                  onClick={() => void handleCreateMenuWithFirstItem()}
                  disabled={busy}
                >
                  <Plus size={16} strokeWidth={2} aria-hidden />
                  Criar cardápio com este item
                </button>
                <button
                  type="button"
                  className="menu-btn menu-btn--ghost"
                  onClick={() => void handleCreateMenuEmpty()}
                  disabled={busy}
                >
                  Começar sem itens
                </button>
              </div>
            </div>
            <aside className="menu-page__aside">
              <MenuPreviewPanel items={[]} soldOutIds={soldOutIds} />
            </aside>
          </div>
        ) : null}

        {!loading && menu ? (
          <div className="menu-page__grid">
            <div>
              <div className="menu-tabs" role="tablist" aria-label="Filtrar por categoria">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'ALL'}
                  className={`menu-tab${activeTab === 'ALL' ? ' menu-tab--active' : ''}`}
                  onClick={() => setActiveTab('ALL')}
                >
                  Todos ({menu.items.length})
                </button>
                {tabTypes.map((t) => {
                  const count = menu.items.filter((i) => i.type === t).length
                  return (
                    <button
                      key={t}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === t}
                      className={`menu-tab${activeTab === t ? ' menu-tab--active' : ''}`}
                      onClick={() => setActiveTab(t)}
                    >
                      {menuItemTypeLabel(t)} ({count})
                    </button>
                  )
                })}
              </div>

              <ul className="menu-item-list">
                {filteredItems.length === 0 ? (
                  <li className="menu-item-list__empty">Nenhum item nesta categoria.</li>
                ) : (
                  filteredItems.map((it) => (
                    <li key={it.id} className="menu-item-row">
                      <div className="menu-item-row__visual">
                        {it.photoMenuItem ? (
                          <img src={it.photoMenuItem} alt="" className="menu-item-row__thumb" loading="lazy" />
                        ) : (
                          <div className="menu-item-row__thumb menu-item-row__thumb--ph" aria-hidden />
                        )}
                      </div>
                      <div className="menu-item-row__main">
                        <div className="menu-item-row__top">
                          <span className="menu-item-row__name">{it.name}</span>
                          <span className="menu-item-row__price">{formatBrl(it.price)}</span>
                        </div>
                        {it.description ? (
                          <p className="menu-item-row__desc">{it.description}</p>
                        ) : null}
                        <span className="menu-item-row__type">{menuItemTypeLabel(it.type)}</span>
                      </div>
                      <div className="menu-item-row__actions">
                        <button
                          type="button"
                          className="menu-icon-btn"
                          title="Editar"
                          aria-label="Editar"
                          onClick={() => openEdit(it)}
                          disabled={busy}
                        >
                          <Pencil size={18} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          className="menu-icon-btn"
                          title="Duplicar"
                          aria-label="Duplicar"
                          onClick={() => openDuplicate(it)}
                          disabled={busy}
                        >
                          <Copy size={18} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          className={`menu-icon-btn${soldOutIds.has(it.id) ? ' menu-icon-btn--on' : ''}`}
                          title="Marcar esgotado (local)"
                          aria-label="Marcar esgotado"
                          aria-pressed={soldOutIds.has(it.id)}
                          onClick={() => toggleSoldOut(it.id)}
                        >
                          <span className="menu-icon-btn__txt">Esgotado</span>
                        </button>
                        <button
                          type="button"
                          className="menu-icon-btn menu-icon-btn--danger"
                          title="Eliminar"
                          aria-label="Eliminar"
                          onClick={() => void handleDeleteItem(it)}
                          disabled={busy}
                        >
                          <Trash2 size={18} strokeWidth={2} />
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <aside className="menu-page__aside">
              <MenuPreviewPanel items={menu.items} soldOutIds={soldOutIds} />
            </aside>
          </div>
        ) : null}
      </div>

      {menu ? (
        <MenuItemEditor
          open={editorOpen}
          menuId={menu.id}
          item={editingItem}
          duplicateFrom={duplicateFrom}
          onClose={closeEditor}
          onSaved={() => void load()}
        />
      ) : null}
    </div>
  )
}
