import type { AssetFilters, GeoJsonImportReport, ImportResult, OsmKind } from '../types'
import { jsonBody, request, toQuery } from './client'

export function uploadGeoJson(file: File, dryRun: boolean) {
  const form = new FormData()
  form.append('file', file)
  return request<GeoJsonImportReport>(`/api/import/geojson${toQuery({ dryRun })}`, { method: 'POST', body: form })
}

export function importOsmNeighborhoods(district: string) {
  return request<ImportResult>('/api/import/osm/neighborhoods', jsonBody('POST', { district }))
}

export function importOsmAssets(district: string, kinds: OsmKind[], maxPerKind: number) {
  return request<ImportResult>('/api/import/osm/assets', jsonBody('POST', { district, kinds, maxPerKind }))
}

export function reassignNeighborhoods() {
  return request<{ updated: number }>('/api/neighborhoods/reassign', { method: 'POST' })
}

// İndirme bağlantısı: tarayıcı doğrudan indirir (Content-Disposition: attachment).
export function exportUrl(format: 'geojson' | 'csv', filters: Partial<AssetFilters> = {}) {
  const query = toQuery({
    search: filters.search?.trim(),
    category: filters.categories,
    status: filters.statuses,
    neighborhood: filters.neighborhood,
  })
  return `/api/export/assets.${format}${query}`
}
