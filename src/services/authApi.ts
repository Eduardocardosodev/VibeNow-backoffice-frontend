import { assertApiConfigured } from '@/lib/apiBaseUrl'
import type {
  LoginEmailResponse,
  MeResponse,
  RegisterEstablishmentAndOwnerBody,
  RegisterEstablishmentAndOwnerResponse,
} from '@/types/auth'

export class AuthApiError extends Error {
  readonly status: number
  readonly body: unknown | undefined

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'AuthApiError'
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
  if (!res.ok) {
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
    throw new AuthApiError(msg, res.status, body)
  }
  return res.json() as Promise<T>
}

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<LoginEmailResponse> {
  const base = assertApiConfigured()
  const res = await fetch(`${base}/auth/login-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return jsonOrThrow<LoginEmailResponse>(res)
}

export async function registerEstablishmentAndOwner(
  body: RegisterEstablishmentAndOwnerBody,
): Promise<RegisterEstablishmentAndOwnerResponse> {
  const base = assertApiConfigured()
  const res = await fetch(`${base}/auth/register-establishment-and-owner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return jsonOrThrow<RegisterEstablishmentAndOwnerResponse>(res)
}

export async function fetchMe(accessToken: string): Promise<MeResponse> {
  const base = assertApiConfigured()
  const res = await fetch(`${base}/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })
  return jsonOrThrow<MeResponse>(res)
}

export async function refreshTokens(refreshToken: string): Promise<LoginEmailResponse> {
  const base = assertApiConfigured()
  const res = await fetch(`${base}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  return jsonOrThrow<LoginEmailResponse>(res)
}
