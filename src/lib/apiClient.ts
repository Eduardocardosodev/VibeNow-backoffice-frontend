import { assertApiConfigured } from '@/lib/apiBaseUrl'
import { authStorage } from '@/lib/authStorage'
import { emitSessionInvalidated } from '@/lib/authSession'
import { AuthApiError, refreshTokens } from '@/services/authApi'

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown | undefined

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

function messageFromErrorJson(data: unknown): string {
  if (!data || typeof data !== 'object') return 'Pedido falhou'
  const msg = (data as { message?: string | string[] }).message
  if (typeof msg === 'string') return msg
  if (Array.isArray(msg)) return msg.join(', ')
  return 'Pedido falhou'
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  const raw = await res.text()
  if (!res.ok) {
    let body: unknown
    let msg = res.statusText || 'Pedido falhou'
    if (raw) {
      try {
        body = JSON.parse(raw) as unknown
        msg = messageFromErrorJson(body)
      } catch {
        body = undefined
      }
    }
    throw new ApiError(msg, res.status, body)
  }
  if (!raw.trim()) {
    return undefined as T
  }
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new ApiError('Resposta JSON inválida', res.status)
  }
}

function withBearer(init: RequestInit, accessToken: string): RequestInit {
  const headers = new Headers(init.headers as HeadersInit | undefined)
  headers.set('Authorization', `Bearer ${accessToken}`)
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }
  return { ...init, headers }
}

/** Evita vários refresh em paralelo quando vários pedidos recebem 401 ao mesmo tempo. */
let refreshInFlight: Promise<string> | null = null

async function performTokenRefresh(): Promise<string> {
  if (refreshInFlight) {
    return refreshInFlight
  }

  const refresh = authStorage.getRefreshToken()
  if (!refresh) {
    authStorage.clear()
    emitSessionInvalidated()
    throw new ApiError('Sessão expirada', 401)
  }

  const p = (async () => {
    try {
      const next = await refreshTokens(refresh)
      authStorage.setTokens(next.accessToken, next.refreshToken)
      return next.accessToken
    } catch (e) {
      authStorage.clear()
      emitSessionInvalidated()
      const msg = e instanceof AuthApiError ? e.message : 'Sessão expirada'
      const body = e instanceof AuthApiError ? e.body : undefined
      throw new ApiError(msg, 401, body)
    } finally {
      refreshInFlight = null
    }
  })()

  refreshInFlight = p
  return p
}

/**
 * Executa fetch com Bearer; em 401 tenta POST /auth/refresh e repete o pedido uma vez.
 */
async function fetchWithAuthRefresh(url: string, init: RequestInit): Promise<Response> {
  const token0 = authStorage.getAccessToken()
  if (!token0) {
    throw new ApiError('Sessão expirada', 401)
  }

  let res = await fetch(url, withBearer(init, token0))
  if (res.status !== 401) {
    return res
  }

  const token1 = await performTokenRefresh()
  res = await fetch(url, withBearer(init, token1))
  return res
}

async function rejectIfNotOk(res: Response): Promise<void> {
  if (res.ok) return
  const raw = await res.text()
  let body: unknown
  let msg = res.statusText || 'Pedido falhou'
  if (raw) {
    try {
      body = JSON.parse(raw) as unknown
      msg = messageFromErrorJson(body)
    } catch {
      body = undefined
    }
  }
  throw new ApiError(msg, res.status, body)
}

export async function apiGetJson<T>(pathWithQuery: string): Promise<T> {
  const base = assertApiConfigured()
  const url = pathWithQuery.startsWith('http') ? pathWithQuery : `${base}${pathWithQuery}`
  const res = await fetchWithAuthRefresh(url, { method: 'GET' })
  return jsonOrThrow<T>(res)
}

export async function apiPostJson<T>(path: string, body: unknown): Promise<T> {
  const base = assertApiConfigured()
  const url = path.startsWith('http') ? path : `${base}${path}`
  const res = await fetchWithAuthRefresh(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return jsonOrThrow<T>(res)
}

/** POST com `FormData` (ex.: upload). Não definir Content-Type — o browser define o boundary. */
export async function apiPostFormData<T>(path: string, formData: FormData): Promise<T> {
  const base = assertApiConfigured()
  const url = path.startsWith('http') ? path : `${base}${path}`
  const res = await fetchWithAuthRefresh(url, {
    method: 'POST',
    body: formData,
  })
  return jsonOrThrow<T>(res)
}

/** PATCH com `FormData` (multipart). */
export async function apiPatchFormData<T>(path: string, formData: FormData): Promise<T> {
  const base = assertApiConfigured()
  const url = path.startsWith('http') ? path : `${base}${path}`
  const res = await fetchWithAuthRefresh(url, {
    method: 'PATCH',
    body: formData,
  })
  return jsonOrThrow<T>(res)
}

export async function apiPatchJson<T>(path: string, body: unknown): Promise<T> {
  const base = assertApiConfigured()
  const url = path.startsWith('http') ? path : `${base}${path}`
  const res = await fetchWithAuthRefresh(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return jsonOrThrow<T>(res)
}

export async function apiDelete(path: string): Promise<void> {
  const base = assertApiConfigured()
  const url = path.startsWith('http') ? path : `${base}${path}`
  const res = await fetchWithAuthRefresh(url, { method: 'DELETE' })
  await rejectIfNotOk(res)
}
