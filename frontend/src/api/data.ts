import type { AssetFilters, GeoJsonImportReport, ImportResult, OsmKind } from '../types'
import { authFetch, jsonBody, request, toQuery } from './client'

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

function exportUrl(format: 'geojson' | 'csv', filters: Partial<AssetFilters>) {
  const query = toQuery({
    search: filters.search?.trim(),
    category: filters.categories,
    status: filters.statuses,
    neighborhood: filters.neighborhood,
  })
  return `/api/export/assets.${format}${query}`
}

// Dışa aktarma uç noktası kimlik ister; <a href> tarayıcıda Authorization başlığı gönderemez.
// Bu yüzden dosya kimlikli istekle alınır ve blob olarak indirilir.
export async function downloadExport(format: 'geojson' | 'csv', filters: Partial<AssetFilters> = {}) {
  const response = await authFetch(exportUrl(format, filters))
  const blob = await response.blob()

  const disposition = response.headers.get('Content-Disposition') ?? ''
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)
  const fileName = match ? decodeURIComponent(match[1]) : `smartcity-varliklar.${format}`

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
