type Listener = () => void

const listeners = new Set<Listener>()

/** Quando tokens são invalidados (refresh falhou); o AuthProvider deve fazer logout de estado. */
export function subscribeSessionInvalidated(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function emitSessionInvalidated(): void {
  for (const fn of [...listeners]) {
    try {
      fn()
    } catch {
      /* evitar que um listener parta os outros */
    }
  }
}
