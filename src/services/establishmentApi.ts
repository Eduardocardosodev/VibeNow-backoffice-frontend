import { apiGetJson, apiPatchJson } from '@/lib/apiClient'
import type { Establishment, PatchEstablishmentBody } from '@/types/establishment'

export async function fetchEstablishment(id: number): Promise<Establishment> {
  return apiGetJson<Establishment>(`/establishments/${id}`)
}

export async function patchEstablishment(
  id: number,
  body: PatchEstablishmentBody,
): Promise<Establishment> {
  return apiPatchJson<Establishment>(`/establishments/${id}`, body)
}
