import type {
  Asset,
  AssetFeatureCollection,
  AssetFilters,
  AssetInput,
  AssetListItem,
  AssetSort,
  NearbyAsset,
  PagedResult,
  Summary,
} from '../types'
import { jsonBody, request, toQuery } from './client'

function filterParams(filters: AssetFilters) {
  return {
    search: filters.search.trim(),
    category: filters.categories,
    status: filters.statuses,
    neighborhood: filters.neighborhood,
  }
}

export function getAssetList(
  filters: AssetFilters,
  sort: AssetSort,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
) {
  const query = toQuery({ ...filterParams(filters), ...sort, page, pageSize })
  return request<PagedResult<AssetListItem>>(`/api/assets${query}`, { signal })
}

export function getAssetGeoJson(filters: AssetFilters, signal?: AbortSignal) {
  return request<AssetFeatureCollection>(`/api/assets/geojson${toQuery(filterParams(filters))}`, { signal })
}

export function getAsset(id: number, signal?: AbortSignal) {
  return request<Asset>(`/api/assets/${id}`, { signal })
}

export function createAsset(input: AssetInput) {
  return request<Asset>('/api/assets', jsonBody('POST', input))
}

export function updateAsset(id: number, input: AssetInput) {
  return request<Asset>(`/api/assets/${id}`, jsonBody('PUT', input))
}

export function deleteAsset(id: number) {
  return request<void>(`/api/assets/${id}`, { method: 'DELETE' })
}

export function getNearby(lat: number, lon: number, radius: number, signal?: AbortSignal) {
  return request<NearbyAsset[]>(`/api/assets/nearby${toQuery({ lat, lon, radius })}`, { signal })
}

export function getNeighborhoods(signal?: AbortSignal) {
  return request<string[]>('/api/assets/neighborhoods', { signal })
}

export function getSummary(signal?: AbortSignal) {
  return request<Summary>('/api/reports/summary', { signal })
}
