import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  changeMaintenanceStatus,
  createMaintenance,
  deleteMaintenance,
  getAssetMaintenance,
  getDashboard,
  getMaintenanceList,
  getMaintenanceSummary,
  updateMaintenance,
} from '../api/maintenance'
import type { MaintenanceFilters, MaintenanceInput, MaintenanceStatus } from '../types'

export function useAssetMaintenance(assetId: number | null) {
  return useQuery({
    queryKey: ['maintenance', 'asset', assetId],
    queryFn: ({ signal }) => getAssetMaintenance(assetId as number, signal),
    enabled: assetId !== null,
  })
}

export function useMaintenanceList(filters: MaintenanceFilters, page: number, pageSize: number) {
  return useQuery({
    queryKey: ['maintenance', 'list', filters, page, pageSize],
    queryFn: ({ signal }) => getMaintenanceList(filters, page, pageSize, signal),
    placeholderData: keepPreviousData,
  })
}

export function useMaintenanceSummary() {
  return useQuery({
    queryKey: ['maintenance', 'summary'],
    queryFn: ({ signal }) => getMaintenanceSummary(signal),
  })
}

export function useDashboard() {
  return useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: ({ signal }) => getDashboard(signal),
  })
}

// Bakım değişince: bakım listeleri, özetler, panel ve (durum değişebileceği için) varlıklar yenilenir.
function useInvalidateMaintenance() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['maintenance'] }),
      queryClient.invalidateQueries({ queryKey: ['reports'] }),
      queryClient.invalidateQueries({ queryKey: ['assets'] }),
      queryClient.invalidateQueries({ queryKey: ['summary'] }),
      queryClient.invalidateQueries({ queryKey: ['neighborhoods'] }),
    ])
}

export function useCreateMaintenance() {
  const invalidate = useInvalidateMaintenance()
  return useMutation({
    mutationFn: ({ assetId, input }: { assetId: number; input: MaintenanceInput }) => createMaintenance(assetId, input),
    onSuccess: invalidate,
  })
}

export function useUpdateMaintenance() {
  const invalidate = useInvalidateMaintenance()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: MaintenanceInput }) => updateMaintenance(id, input),
    onSuccess: invalidate,
  })
}

export function useChangeMaintenanceStatus() {
  const invalidate = useInvalidateMaintenance()
  return useMutation({
    mutationFn: ({ id, status, cost }: { id: number; status: MaintenanceStatus; cost?: number | null }) =>
      changeMaintenanceStatus(id, status, cost),
    onSuccess: invalidate,
  })
}

export function useDeleteMaintenance() {
  const invalidate = useInvalidateMaintenance()
  return useMutation({
    mutationFn: (id: number) => deleteMaintenance(id),
    onSuccess: invalidate,
  })
}
