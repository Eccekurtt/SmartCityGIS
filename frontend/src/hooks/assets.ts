import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAsset,
  deleteAsset,
  getAsset,
  getAssetGeoJson,
  getAssetList,
  getNearby,
  getNeighborhoods,
  getSummary,
  updateAsset,
} from '../api/assets'
import type { AssetFilters, AssetInput, AssetSort } from '../types'

export function useAssetList(filters: AssetFilters, sort: AssetSort, page: number, pageSize: number) {
  return useQuery({
    queryKey: ['assets', 'list', filters, sort, page, pageSize],
    queryFn: ({ signal }) => getAssetList(filters, sort, page, pageSize, signal),
    // Sayfa/filtre değişirken eski veriyi göstermeye devam et (titreme olmasın).
    placeholderData: keepPreviousData,
  })
}

export function useAssetGeoJson(filters: AssetFilters) {
  return useQuery({
    queryKey: ['assets', 'geojson', filters],
    queryFn: ({ signal }) => getAssetGeoJson(filters, signal),
    placeholderData: keepPreviousData,
  })
}

export function useAsset(id: number | null) {
  return useQuery({
    queryKey: ['assets', 'detail', id],
    queryFn: ({ signal }) => getAsset(id as number, signal),
    enabled: id !== null,
  })
}

export function useNeighborhoods() {
  return useQuery({
    queryKey: ['assets', 'neighborhoods'],
    queryFn: ({ signal }) => getNeighborhoods(signal),
  })
}

export function useSummary() {
  return useQuery({
    queryKey: ['summary'],
    queryFn: ({ signal }) => getSummary(signal),
  })
}

// Ekleme/güncelleme/silme sonrası listeler, harita ve özet kartları yenilenir.
function useInvalidateAssets() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['assets'] }),
      queryClient.invalidateQueries({ queryKey: ['summary'] }),
      queryClient.invalidateQueries({ queryKey: ['reports'] }),
    ])
}

export function useCreateAsset() {
  const invalidate = useInvalidateAssets()
  return useMutation({
    mutationFn: (input: AssetInput) => createAsset(input),
    onSuccess: invalidate,
  })
}

export function useUpdateAsset() {
  const invalidate = useInvalidateAssets()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: AssetInput }) => updateAsset(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteAsset() {
  const invalidate = useInvalidateAssets()
  return useMutation({
    mutationFn: (id: number) => deleteAsset(id),
    onSuccess: invalidate,
  })
}

export function useNearby(origin: { lat: number; lon: number } | null, radius: number) {
  return useQuery({
    queryKey: ['assets', 'nearby', origin?.lat, origin?.lon, radius],
    queryFn: ({ signal }) => getNearby(origin!.lat, origin!.lon, radius, signal),
    enabled: origin !== null,
    placeholderData: keepPreviousData,
  })
}
