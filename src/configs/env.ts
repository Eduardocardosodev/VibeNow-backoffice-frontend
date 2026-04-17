/**
 * Variáveis públicas (prefixo VITE_). Defina em `.env` / `.env.local`.
 */
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
} as const
