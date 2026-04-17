/**
 * Geocodificação via Nominatim (OpenStreetMap).
 * Política de uso: volume moderado; em produção pode ser preferível um proxy no backend.
 */

export interface AddressParts {
  street: string
  city: string
  state: string
  /** 8 dígitos ou já mascarado — usado só para montar a query */
  postalcode: string
}

export class GeocodeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GeocodeError'
  }
}

type NominatimItem = { lat: string; lon: string }

async function nominatimSearch(q: string): Promise<NominatimItem[]> {
  const params = new URLSearchParams({
    format: 'json',
    limit: '2',
    countrycodes: 'br',
    q,
  })

  const base = import.meta.env.DEV
    ? '/geo/nominatim'
    : 'https://nominatim.openstreetmap.org'

  const url = `${base}/search?${params.toString()}`

  const res = await fetch(url, {
    headers: {
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
  })

  if (!res.ok) {
    throw new GeocodeError('Serviço de mapas indisponível.')
  }

  return res.json() as Promise<NominatimItem[]>
}

function pickFirst(items: NominatimItem[]): { lat: number; lon: number } {
  const first = items[0]
  if (!first) {
    throw new GeocodeError('Endereço não encontrado no mapa.')
  }
  const lat = Number.parseFloat(first.lat)
  const lon = Number.parseFloat(first.lon)
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    throw new GeocodeError('Coordenadas inválidas.')
  }
  return { lat, lon }
}

const digitsOnly = (s: string) => s.replace(/\D/g, '')

/**
 * Tenta localizar o ponto a partir da morada completa; se falhar, usa cidade + UF + CEP.
 */
export async function geocodeBrazilAddress(parts: AddressParts): Promise<{ lat: number; lon: number }> {
  const cep = digitsOnly(parts.postalcode)
  const city = parts.city.trim()
  const state = parts.state.trim().toUpperCase()
  const street = parts.street.trim()

  if (cep.length !== 8 || state.length !== 2 || city.length < 2) {
    throw new GeocodeError('Preencha CEP (8 dígitos), cidade e UF para localizar.')
  }

  const queries: string[] = []
  if (street.length >= 2) {
    queries.push(`${street}, ${city}, ${state}, ${cep}, Brasil`)
  }
  queries.push(`${city}, ${state}, ${cep}, Brasil`)

  let lastErr: Error | null = null
  for (const q of queries) {
    try {
      const items = await nominatimSearch(q)
      return pickFirst(items)
    } catch (e) {
      lastErr = e instanceof Error ? e : new GeocodeError('Falha na geocodificação.')
    }
  }

  throw lastErr ?? new GeocodeError('Não foi possível obter coordenadas.')
}
