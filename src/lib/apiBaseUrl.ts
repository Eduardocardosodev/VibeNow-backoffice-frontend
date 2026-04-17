import { env } from '@/configs'

/** Base da API sem barra final. */
export function getApiBaseUrl(): string {
  const raw = env.apiBaseUrl.trim().replace(/\/$/, '')
  return raw
}

export function assertApiConfigured(): string {
  const base = getApiBaseUrl()
  if (!base) {
    throw new Error(
      'Defina VITE_API_BASE_URL no ficheiro .env (ex.: http://localhost:3004)',
    )
  }
  return base
}
