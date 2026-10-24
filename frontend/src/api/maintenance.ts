import type {
  Dashboard,
  MaintenanceFilters,
  MaintenanceInput,
  MaintenanceRecord,
  MaintenanceStatus,
  MaintenanceSummary,
  PagedResult,
} from '../types'
import { jsonBody, request, toQuery } from './client'

export function getAssetMaintenance(assetId: number, signal?: AbortSignal) {
  return request<MaintenanceRecord[]>(`/api/assets/${assetId}/maintenance`, { signal })
}

export function createMaintenance(assetId: number, input: MaintenanceInput) {
  return request<MaintenanceRecord>(`/api/assets/${assetId}/maintenance`, jsonBody('POST', input))
}

export function updateMaintenance(id: number, input: MaintenanceInput) {
  return request<MaintenanceRecord>(`/api/maintenance/${id}`, jsonBody('PUT', input))
}

export function changeMaintenanceStatus(id: number, status: MaintenanceStatus, cost?: number | null) {
  return request<MaintenanceRecord>(`/api/maintenance/${id}/status`, jsonBody('POST', { status, cost }))
}

export function deleteMaintenance(id: number) {
  return request<void>(`/api/maintenance/${id}`, { method: 'DELETE' })
}

export function getMaintenanceList(filters: MaintenanceFilters, page: number, pageSize: number, signal?: AbortSignal) {
  const query = toQuery({
    status: filters.statuses,
    type: filters.types,
    overdueOnly: filters.overdueOnly,
    search: filters.search.trim(),
    page,
    pageSize,
  })
  return request<PagedResult<MaintenanceRecord>>(`/api/maintenance${query}`, { signal })
}

export function getMaintenanceSummary(signal?: AbortSignal) {
  return request<MaintenanceSummary>('/api/maintenance/summary', { signal })
}

export function getDashboard(signal?: AbortSignal) {
  return request<Dashboard>('/api/reports/dashboard', { signal })
}
