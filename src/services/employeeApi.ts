import { apiDelete, apiGetJson, apiPatchJson, apiPostJson } from '@/lib/apiClient'
import type {
  CreateEmployeeBody,
  CreatedEmployee,
  EmployeeDetail,
  EmployeeListItem,
} from '@/types/employee'

const base = (estId: number) => `/establishments/${estId}/employees`

export async function createEmployee(
  establishmentId: number,
  body: CreateEmployeeBody,
): Promise<CreatedEmployee> {
  return apiPostJson<CreatedEmployee>(base(establishmentId), body)
}

export async function fetchEmployees(
  establishmentId: number,
): Promise<EmployeeListItem[]> {
  return apiGetJson<EmployeeListItem[]>(base(establishmentId))
}

export async function fetchEmployeeDetail(
  establishmentId: number,
  userId: number,
): Promise<EmployeeDetail> {
  return apiGetJson<EmployeeDetail>(`${base(establishmentId)}/${userId}`)
}

export async function patchEmployeeActive(
  establishmentId: number,
  userId: number,
  active: boolean,
): Promise<EmployeeListItem> {
  return apiPatchJson<EmployeeListItem>(
    `${base(establishmentId)}/${userId}/active`,
    { active },
  )
}

export async function deleteEmployee(
  establishmentId: number,
  userId: number,
): Promise<void> {
  return apiDelete(`${base(establishmentId)}/${userId}`)
}
