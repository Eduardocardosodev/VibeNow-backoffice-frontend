import type { MenuItem } from '@/types/menu'
import { menuItemTypeLabel } from '@/types/menu'

function formatBrl(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

interface MenuPreviewPanelProps {
  items: MenuItem[]
  soldOutIds: ReadonlySet<number>
}

/** Agrupa por tipo e simula cartões como no app (lista vertical). */
export function MenuPreviewPanel({ items, soldOutIds }: MenuPreviewPanelProps) {
  const byType = new Map<string, MenuItem[]>()
  for (const it of items) {
    const list = byType.get(it.type) ?? []
    list.push(it)
    byType.set(it.type, list)
  }
  const types = [...byType.keys()].sort((a, b) => menuItemTypeLabel(a).localeCompare(menuItemTypeLabel(b), 'pt'))

  if (items.length === 0) {
    return (
      <div className="menu-preview">
        <p className="menu-preview__title">Preview no app</p>
        <div className="menu-preview__device">
          <p className="menu-preview__empty">Sem itens para mostrar.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="menu-preview">
      <p className="menu-preview__title">Preview no app</p>
      <div className="menu-preview__device" aria-label="Pré-visualização do cardápio">
        <div className="menu-preview__status">
          <span className="menu-preview__dot" />
          Cardápio
        </div>
        {types.map((type) => (
          <section key={type} className="menu-preview__section">
            <h3 className="menu-preview__section-title">{menuItemTypeLabel(type)}</h3>
            <ul className="menu-preview__list">
              {(byType.get(type) ?? []).map((it) => {
                const sold = soldOutIds.has(it.id)
                return (
                  <li key={it.id} className={`menu-preview__card${sold ? ' menu-preview__card--sold' : ''}`}>
                    <div className="menu-preview__card-main">
                      {it.photoMenuItem ? (
                        <img
                          className="menu-preview__img"
                          src={it.photoMenuItem}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <div className="menu-preview__img menu-preview__img--ph" aria-hidden />
                      )}
                      <div className="menu-preview__card-body">
                        <p className="menu-preview__name">{it.name}</p>
                        {it.description ? (
                          <p className="menu-preview__desc">{it.description}</p>
                        ) : null}
                        <p className="menu-preview__price">{formatBrl(it.price)}</p>
                        {sold ? <span className="menu-preview__sold-badge">Esgotado</span> : null}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
      <p className="menu-preview__note">
        “Esgotado” é só neste ecrã — não é guardado no servidor.
      </p>
    </div>
  )
}
