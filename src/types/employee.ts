export interface CreateEmployeeBody {
  name: string
  phone: string
  email?: string
  password: string
}

export interface CreatedEmployee {
  id: number
  name: string
  phone: string
  email: string | null
  role: string
  createdAt: string
}

export interface EmployeeListItem {
  employeeLinkId: number
  userId: number
  name: string
  phone: string
  email: string | null
  active: boolean
  linkedAt: string
  userCreatedAt: string
}

export interface EmployeeDetail extends EmployeeListItem {
  role: string
  userUpdatedAt: string
}
