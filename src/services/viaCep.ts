/** Resposta da API pública ViaCEP (https://viacep.com.br/) */

export interface ViaCepSuccess {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  ibge?: string
  gia?: string
  ddd?: string
  siafi?: string
  /** Presente quando o CEP não existe */
  erro?: true
}

export class ViaCepError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ViaCepError'
  }
}

/**
 * @param cepDigits — exatamente 8 dígitos, sem máscara
 */
export async function fetchViaCep(cepDigits: string): Promise<ViaCepSuccess> {
  if (cepDigits.length !== 8 || !/^\d{8}$/.test(cepDigits)) {
    throw new ViaCepError('CEP deve ter 8 dígitos.')
  }

  const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`)
  if (!res.ok) {
    throw new ViaCepError('Falha ao consultar o CEP. Tente novamente.')
  }

  const data = (await res.json()) as ViaCepSuccess
  if (data.erro === true) {
    throw new ViaCepError('CEP não encontrado.')
  }

  return data
}

/** Formata 12345678 → 12345-678 */
export function formatCepMask(cepDigits: string): string {
  const d = cepDigits.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}
