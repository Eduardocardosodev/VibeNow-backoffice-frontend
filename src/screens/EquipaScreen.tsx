import { useCallback, useEffect, useMemo, useState } from 'react'
import { Trash2, UserPlus, Users } from 'lucide-react'
import { useAuth } from '@/contexts'
import { ApiError } from '@/lib/apiClient'
import {
  deleteEmployee,
  fetchEmployees,
  patchEmployeeActive,
} from '@/services/employeeApi'
import type { EmployeeListItem } from '@/types/employee'
import { EmployeeCreateModal } from '@/components/equipa/EmployeeCreateModal'
import { ConfirmDeleteDialog } from '@/components/equipa/ConfirmDeleteDialog'
import '@/styles/equipa.css'

/* ── helpers ──────────────────────────────────────────────── */

function phoneDigits(v: string): string {
  return v.replace(/\D/g, '')
}

function formatPhoneBr(raw: string): string {
  const d = phoneDigits(raw).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AVATAR_COLORS = [
  '#00C853', '#2979FF', '#FF6D00', '#D500F9',
  '#00BFA5', '#FFD600', '#FF1744', '#651FFF',
]

function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

/* ── component ────────────────────────────────────────────── */

export function EquipaScreen() {
  const { access, activeEstablishmentId, selectEstablishment } = useAuth()

  const [employees, setEmployees] = useState<EmployeeListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<EmployeeListItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const establishmentOptions = useMemo(() => {
    const m = new Map<number, string>()
    access?.ownedEstablishments.forEach((e) => m.set(e.id, e.name))
    access?.employments.forEach((e) => m.set(e.establishmentId, e.establishmentName))
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1], 'pt'))
  }, [access])

  const isOwner = useMemo(() => {
    if (!access || activeEstablishmentId == null) return false
    return access.ownedEstablishments.some((e) => e.id === activeEstablishmentId)
  }, [access, activeEstablishmentId])

  useEffect(() => {
    if (activeEstablishmentId == null && establishmentOptions.length === 1) {
      selectEstablishment(establishmentOptions[0][0])
    }
  }, [activeEstablishmentId, establishmentOptions, selectEstablishment])

  const load = useCallback(async () => {
    if (activeEstablishmentId == null) {
      setEmployees([])
      setLoading(false)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const list = await fetchEmployees(activeEstablishmentId)
      setEmployees(list)
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setError('Apenas o dono do estabelecimento pode gerir a equipa.')
      } else {
        setError(
          e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Erro ao carregar funcionários',
        )
      }
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

  /* ── toggle active ──────────────────────────────────────── */

  async function handleToggleActive(emp: EmployeeListItem) {
    if (!activeEstablishmentId || togglingId !== null) return
    const prev = emp.active
    const next = !prev

    setTogglingId(emp.userId)
    setEmployees((list) =>
      list.map((e) => (e.userId === emp.userId ? { ...e, active: next } : e)),
    )

    try {
      const updated = await patchEmployeeActive(activeEstablishmentId, emp.userId, next)
      setEmployees((list) =>
        list.map((e) => (e.userId === emp.userId ? updated : e)),
      )
      setToast(`${emp.name} ${next ? 'ativado' : 'desativado'} com sucesso.`)
    } catch (e) {
      setEmployees((list) =>
        list.map((el) => (el.userId === emp.userId ? { ...el, active: prev } : el)),
      )
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Erro ao alterar estado'
      setError(msg)
    } finally {
      setTogglingId(null)
    }
  }

  /* ── delete ─────────────────────────────────────────────── */

  async function handleConfirmDelete() {
    if (!activeEstablishmentId || !deleteTarget) return
    setDeleting(true)
    try {
      await deleteEmployee(activeEstablishmentId, deleteTarget.userId)
      setEmployees((list) => list.filter((e) => e.userId !== deleteTarget.userId))
      setToast(`${deleteTarget.name} removido com sucesso.`)
      setDeleteTarget(null)
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Erro ao remover'
      setError(msg)
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  /* ── create callback ────────────────────────────────────── */

  function handleCreated(emp: EmployeeListItem) {
    setEmployees((prev) => [emp, ...prev])
    setToast(`Funcionário "${emp.name}" criado com sucesso.`)
  }

  /* ── render: no establishment ───────────────────────────── */

  if (activeEstablishmentId == null) {
    return (
      <div className="eq-page">
        <div className="eq-page__inner">
          <header className="eq-page__header">
            <div>
              <p className="eq-page__eyebrow">Gestão</p>
              <h1 className="eq-page__title">Equipa</h1>
              <p className="eq-page__sub">
                Selecione um estabelecimento para gerir os funcionários.
              </p>
            </div>
          </header>
          <p className="eq-page__empty-text">Nenhum estabelecimento disponível nesta conta.</p>
        </div>
      </div>
    )
  }

  /* ── render: main ───────────────────────────────────────── */

  return (
    <div className="eq-page">
      <div className="eq-page__inner">
        <header className="eq-page__header">
          <div>
            <p className="eq-page__eyebrow">Gestão</p>
            <h1 className="eq-page__title">Equipa</h1>
            <p className="eq-page__sub">
              {isOwner
                ? 'Gerencie os funcionários com acesso ao painel do seu estabelecimento.'
                : 'Visualize os funcionários do estabelecimento.'}
            </p>
          </div>
          <div className="eq-page__header-actions">
            {establishmentOptions.length > 1 ? (
              <select
                className="eq-page__select"
                value={activeEstablishmentId}
                onChange={(e) => selectEstablishment(Number(e.target.value))}
                aria-label="Estabelecimento"
              >
                {establishmentOptions.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            ) : null}
            {isOwner ? (
              <button
                type="button"
                className="eq-btn eq-btn--primary eq-btn--add"
                onClick={() => setShowCreateModal(true)}
              >
                <UserPlus size={16} />
                <span>Adicionar</span>
              </button>
            ) : null}
          </div>
        </header>

        {toast ? (
          <div className="eq-toast" role="status" aria-live="polite">
            {toast}
          </div>
        ) : null}

        {error ? (
          <div className="eq-page__error">
            {error}
            <button
              type="button"
              className="eq-page__error-dismiss"
              onClick={() => setError(null)}
            >
              &times;
            </button>
          </div>
        ) : null}

        {loading ? <p className="eq-page__loading">A carregar…</p> : null}

        {!loading && employees.length === 0 && !error ? (
          <div className="eq-empty">
            <span className="eq-empty__icon" aria-hidden>
              <Users size={40} strokeWidth={1.2} />
            </span>
            <h3 className="eq-empty__title">Nenhum funcionário cadastrado</h3>
            <p className="eq-empty__sub">
              Adicione funcionários para que possam acessar o painel de gestão do estabelecimento.
            </p>
            {isOwner ? (
              <button
                type="button"
                className="eq-btn eq-btn--primary"
                onClick={() => setShowCreateModal(true)}
              >
                <UserPlus size={16} />
                <span>Criar primeiro funcionário</span>
              </button>
            ) : null}
          </div>
        ) : null}

        {!loading && employees.length > 0 ? (
          <div className="eq-table-wrap">
            <table className="eq-table">
              <thead>
                <tr>
                  <th className="eq-th">Funcionário</th>
                  <th className="eq-th">Telefone</th>
                  <th className="eq-th eq-th--hide-sm">E-mail</th>
                  <th className="eq-th">Status</th>
                  <th className="eq-th eq-th--hide-sm">Vínculo</th>
                  {isOwner ? <th className="eq-th eq-th--actions">Ações</th> : null}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.userId} className={`eq-row${!emp.active ? ' eq-row--inactive' : ''}`}>
                    <td className="eq-td">
                      <div className="eq-emp-name">
                        <span
                          className="eq-avatar"
                          style={{ backgroundColor: avatarColor(emp.name) }}
                          aria-hidden
                        >
                          {initials(emp.name)}
                        </span>
                        <span className="eq-emp-name__text">{emp.name}</span>
                      </div>
                    </td>
                    <td className="eq-td eq-td--mono">{formatPhoneBr(emp.phone)}</td>
                    <td className="eq-td eq-td--hide-sm">
                      {emp.email ?? <span className="eq-muted">—</span>}
                    </td>
                    <td className="eq-td">
                      {isOwner ? (
                        <label className="eq-switch" aria-label={emp.active ? 'Desativar' : 'Ativar'}>
                          <input
                            type="checkbox"
                            checked={emp.active}
                            onChange={() => void handleToggleActive(emp)}
                            disabled={togglingId !== null}
                          />
                          <span className="eq-switch__track" aria-hidden />
                          <span className="eq-switch__label">
                            {emp.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </label>
                      ) : (
                        <span className={`eq-badge${emp.active ? ' eq-badge--active' : ' eq-badge--inactive'}`}>
                          {emp.active ? 'Ativo' : 'Inativo'}
                        </span>
                      )}
                    </td>
                    <td className="eq-td eq-td--hide-sm eq-td--muted">
                      {formatDate(emp.linkedAt)}
                    </td>
                    {isOwner ? (
                      <td className="eq-td eq-td--actions">
                        <button
                          type="button"
                          className="eq-icon-btn eq-icon-btn--danger"
                          onClick={() => setDeleteTarget(emp)}
                          aria-label={`Remover ${emp.name}`}
                          title="Remover funcionário"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {showCreateModal ? (
        <EmployeeCreateModal
          establishmentId={activeEstablishmentId}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDeleteDialog
          employeeName={deleteTarget.name}
          loading={deleting}
          onConfirm={() => void handleConfirmDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}
    </div>
  )
}
