import { apiDelete, apiGetJson, apiPostJson } from '@/lib/apiClient'
import type { Quote } from '@/types/quote'

function normalizeQuote(raw: Record<string, unknown>): Quote {
  return {
    id: Number(raw.id) || 0,
    establishmentId: Number(raw.establishmentId) || 0,
    text: String(raw.text ?? ''),
    createdAt: String(raw.createdAt ?? ''),
    expiresAt: String(raw.expiresAt ?? ''),
  }
}

function normalizeQuoteList(raw: unknown): Quote[] {
  if (Array.isArray(raw)) {
    return raw.map((x) => normalizeQuote(x as Record<string, unknown>))
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    const items = o.items ?? o.quotes ?? o.data
    if (Array.isArray(items)) {
      return items.map((x) => normalizeQuote(x as Record<string, unknown>))
    }
  }
  return []
}

export async function createQuote(establishmentId: number, text: string): Promise<Quote> {
  const raw = await apiPostJson<unknown>('/quotes', { establishmentId, text })
  if (!raw || typeof raw !== 'object') {
    throw new Error('Resposta inválida ao criar citação')
  }
  return normalizeQuote(raw as Record<string, unknown>)
}

export async function fetchQuotesByEstablishment(establishmentId: number): Promise<Quote[]> {
  const raw = await apiGetJson<unknown>(`/quotes/establishment/${establishmentId}`)
  return normalizeQuoteList(raw)
}

export async function fetchActiveQuotesByEstablishment(establishmentId: number): Promise<Quote[]> {
  const raw = await apiGetJson<unknown>(`/quotes/establishment/${establishmentId}/active`)
  return normalizeQuoteList(raw)
}

export async function deleteQuote(quoteId: number): Promise<void> {
  await apiDelete(`/quotes/${quoteId}`)
}
