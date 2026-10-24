import type { AssetCategory, AssetStatus } from './types'

export const categoryLabels: Record<AssetCategory, string> = {
  Park: 'Park',
  Road: 'Yol',
  Building: 'Bina',
  StreetLight: 'Sokak Lambası',
  Infrastructure: 'Altyapı',
}

export const categoryColors: Record<AssetCategory, string> = {
  Park: '#16a34a',
  Road: '#6b7280',
  Building: '#7c3aed',
  StreetLight: '#f59e0b',
  Infrastructure: '#0ea5e9',
}

export const statusLabels: Record<AssetStatus, string> = {
  Active: 'Aktif',
  UnderMaintenance: 'Bakımda',
  Inactive: 'Pasif',
}

export const statusColors: Record<AssetStatus, string> = {
  Active: '#16a34a',
  UnderMaintenance: '#d97706',
  Inactive: '#64748b',
}

// PostGIS ST_GeometryType çıktısı (ST_ öneki atılmış) -> Türkçe ad
export const geometryLabels: Record<string, string> = {
  Point: 'Nokta',
  LineString: 'Çizgi',
  MultiLineString: 'Çoklu çizgi',
  Polygon: 'Alan',
  MultiPolygon: 'Çoklu alan',
}

export const categories = Object.keys(categoryLabels) as AssetCategory[]
export const statuses = Object.keys(statusLabels) as AssetStatus[]
