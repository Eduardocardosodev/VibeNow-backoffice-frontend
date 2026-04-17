export interface Quote {
  id: number
  establishmentId: number
  text: string
  createdAt: string
  expiresAt: string
}

export type QuoteLifecycleStatus = 'active' | 'expired'

export function quoteLifecycleStatus(quote: Pick<Quote, 'expiresAt'>, now: Date = new Date()): QuoteLifecycleStatus {
  const t = new Date(quote.expiresAt).getTime()
  if (Number.isNaN(t)) return 'expired'
  return t > now.getTime() ? 'active' : 'expired'
}
