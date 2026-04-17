/** Igual ao app: texto no mapa sem abrir o pin (pré-visualização truncada). */
export const QUOTE_PREVIEW_MAX = 40

export function quotePreview(text: string): string {
  const t = text.trim()
  if (t.length <= QUOTE_PREVIEW_MAX) return t
  return `${t.slice(0, QUOTE_PREVIEW_MAX)}…`
}
