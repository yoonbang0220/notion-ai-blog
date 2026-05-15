export interface User {
  id: string
  name: string
  email: string
  role: "admin" | "user"
  createdAt: Date
}

export interface ApiResponse<T> {
  data: T
  error?: string
  status: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type ThemeMode = "light" | "dark" | "system"
