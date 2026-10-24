import type { AuditEntry, AuditFilters, ManagedUser, PagedResult, UserRole } from '../types'
import { jsonBody, request, toQuery } from './client'

export function getUsers(signal?: AbortSignal) {
  return request<ManagedUser[]>('/api/users', { signal })
}

export interface NewUser {
  userName: string
  displayName: string
  role: UserRole
  password: string
}

export function createUser(input: NewUser) {
  return request<ManagedUser>('/api/users', jsonBody('POST', input))
}

export function updateUser(id: number, input: { displayName: string; role: UserRole; isActive: boolean }) {
  return request<ManagedUser>(`/api/users/${id}`, jsonBody('PUT', input))
}

export function resetPassword(id: number, password: string) {
  return request<void>(`/api/users/${id}/password`, jsonBody('POST', { password }))
}

export function getAudit(filters: AuditFilters, page: number, pageSize: number, signal?: AbortSignal) {
  const query = toQuery({
    entityType: filters.entityType,
    action: filters.action,
    userName: filters.userName.trim(),
    from: filters.from,
    to: filters.to,
    page,
    pageSize,
  })
  return request<PagedResult<AuditEntry>>(`/api/audit${query}`, { signal })
}
