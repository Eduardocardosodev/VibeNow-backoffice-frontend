import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts'
import { ApiError } from '@/lib/apiClient'
import { formatSpDateTimeLabel } from '@/lib/datetimeSp'
import { fetchEstablishmentOrders, patchEstablishmentOrderStatus } from '@/services/ordersApi'
import type { EstablishmentOrder, OrderStatus, OrdersListPage } from '@/types/order'
import { ORDER_STATUSES, orderStatusLabel } from '@/types/order'
import '@/styles/orders.css'

type StatusFilter = 'ALL' | OrderStatus

function formatBrl(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function orderTotal(order: EstablishmentOrder): number {
  return order.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0)
}

const POLL_MS = 45_000

export function OrdersScreen() {
  const { access, activeEstablishmentId, selectEstablishment } = useAuth()

  const [data, setData] = useState<OrdersListPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

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

  const query = useMemo(
    () => ({
      page,
      pageSize,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    }),
    [page, pageSize, statusFilter],
  )

  const load = useCallback(async () => {
    if (activeEstablishmentId == null) {
      setData(null)
      setLoading(false)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetchEstablishmentOrders(activeEstablishmentId, query)
      setData(res)
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Erro ao carregar pedidos'
      setError(msg)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [activeEstablishmentId, query])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, pageSize, activeEstablishmentId])

  useEffect(() => {
    if (activeEstablishmentId == null) return
    const t = window.setInterval(() => void load(), POLL_MS)
    return () => window.clearInterval(t)
  }, [activeEstablishmentId, load])

  async function handleStatusChange(orderId: number, next: OrderStatus) {
    if (activeEstablishmentId == null) return
    const current = data?.items.find((o) => o.id === orderId)
    if (!current || current.status === next) return
    if (next === 'CANCELLED' && !window.confirm('Cancelar este pedido?')) return
    setUpdatingId(orderId)
    setError(null)
    try {
      await patchEstablishmentOrderStatus(activeEstablishmentId, orderId, next)
      await load()
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Erro ao atualizar estado'
      setError(msg)
    } finally {
      setUpdatingId(null)
    }
  }

  const canPrev = (data?.page ?? 1) > 1
  const canNext = data != null && data.page < data.totalPages

  if (activeEstablishmentId == null) {
    return (
      <div className="orders-page">
        <div className="orders-page__inner">
          <header className="orders-page__header">
            <div>
              <p className="orders-page__eyebrow">Operação</p>
              <h1 className="orders-page__title">Pedidos</h1>
              <p className="orders-page__sub">Selecione um estabelecimento para ver a fila de pedidos.</p>
            </div>
          </header>
          <p className="orders-page__empty">Nenhum estabelecimento disponível nesta conta.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="orders-page">
      <div className="orders-page__inner">
        <header className="orders-page__header">
          <div>
            <p className="orders-page__eyebrow">Operação</p>
            <h1 className="orders-page__title">Pedidos</h1>
            <p className="orders-page__sub">
              Lista paginada com cliente, localização e itens. Atualize o estado da fila; a página
              atualiza automaticamente a cada minuto.
            </p>
          </div>
          {establishmentOptions.length > 1 ? (
            <>
              <label className="visually-hidden" htmlFor="orders-establishment">
                Estabelecimento
              </label>
              <select
                id="orders-establishment"
                className="orders-page__select"
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

        {error ? <div className="orders-page__error">{error}</div> : null}

        <div className="orders-page__toolbar">
          {/* <button
            type="button"
            className="orders-btn orders-btn--ghost"
            onClick={() => void load()}
            disabled={loading || updatingId != null}
          >
            <RefreshCw size={16} strokeWidth={2} aria-hidden />
            Atualizar
          </button> */}
          <span className="orders-page__toolbar-meta">
            Total no filtro: <strong>{data?.total ?? '—'}</strong>
          </span>
        </div>

        <div className="orders-filters" role="tablist" aria-label="Filtrar por estado">
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'ALL'}
            className={`orders-filter${statusFilter === 'ALL' ? ' orders-filter--active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            Todos
          </button>
          {ORDER_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={statusFilter === s}
              className={`orders-filter${statusFilter === s ? ' orders-filter--active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {orderStatusLabel(s)}
            </button>
          ))}
        </div>

        <div className="orders-page__pager-top">
          <label className="orders-page__page-size">
            <span className="visually-hidden">Itens por página</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              disabled={loading}
            >
              <option value={20}>20 / página</option>
              <option value={50}>50 / página</option>
              <option value={100}>100 / página</option>
            </select>
          </label>
        </div>

        {loading && !data ? <p className="orders-page__loading">A carregar…</p> : null}

        {!loading && data && data.items.length === 0 ? (
          <p className="orders-page__empty">Nenhum pedido com estes filtros.</p>
        ) : null}

        {data && data.items.length > 0 ? (
          <ul className="orders-list">
            {data.items.map((order) => (
              <li key={order.id} className="orders-card">
                <div className="orders-card__head">
                  <div className="orders-card__ids">
                    <span className="orders-card__id">#{order.id}</span>
                    <span className={`orders-badge orders-badge--${order.status.toLowerCase()}`}>
                      {orderStatusLabel(order.status)}
                    </span>
                  </div>
                  <time className="orders-card__time" dateTime={order.createdAt}>
                    {formatSpDateTimeLabel(order.createdAt)}
                  </time>
                </div>

                <div className="orders-card__customer">
                  <p className="orders-card__customer-name">
                    {order.user?.name ?? `Cliente #${order.userId}`}
                  </p>
                  {order.user?.phone ? (
                    <a className="orders-card__phone" href={`tel:${order.user.phone}`}>
                      {order.user.phone}
                    </a>
                  ) : (
                    <span className="orders-card__phone orders-card__phone--muted">Sem telefone</span>
                  )}
                </div>

                {order.locationNote ? (
                  <p className="orders-card__location">
                    <span className="orders-card__location-label">Local</span> {order.locationNote}
                  </p>
                ) : null}

                <ul className="orders-card__lines">
                  {order.items.map((it) => (
                    <li key={it.id} className="orders-line">
                      <span className="orders-line__qty">{it.quantity}×</span>
                      <span className="orders-line__name">{it.itemName}</span>
                      <span className="orders-line__sub">
                        {formatBrl(it.unitPrice)} / un. · {formatBrl(it.quantity * it.unitPrice)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="orders-card__foot">
                  <p className="orders-card__total">
                    Total <strong>{formatBrl(orderTotal(order))}</strong>
                  </p>
                  <div className="orders-card__status-row">
                    <label htmlFor={`order-status-${order.id}`} className="orders-card__status-label">
                      Estado
                    </label>
                    <select
                      id={`order-status-${order.id}`}
                      className="orders-card__status-select"
                      value={order.status}
                      disabled={updatingId === order.id}
                      onChange={(e) => {
                        const v = e.target.value as OrderStatus
                        void handleStatusChange(order.id, v)
                      }}
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {orderStatusLabel(s)}
                        </option>
                      ))}
                    </select>
                    {updatingId === order.id ? (
                      <span className="orders-card__updating">A guardar…</span>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {data && data.totalPages > 1 ? (
          <div className="orders-page__pager">
            <p className="orders-page__pager-info">
              Página {data.page} de {data.totalPages}
            </p>
            <div className="orders-page__pager-actions">
              <button
                type="button"
                className="orders-btn orders-btn--ghost"
                disabled={!canPrev || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <button
                type="button"
                className="orders-btn orders-btn--ghost"
                disabled={!canNext || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Seguinte
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
