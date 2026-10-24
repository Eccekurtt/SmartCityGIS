import type { FeatureCollection, Geometry } from 'geojson'

// Backend modelinin JSON karşılığı (AssetEnums.cs ile aynı değerler).
export type AssetCategory = 'Park' | 'Road' | 'Building' | 'StreetLight' | 'Infrastructure'

export type AssetStatus = 'Active' | 'UnderMaintenance' | 'Inactive'

// Detay uç noktası (GET /api/assets/{id}) tam kaydı, geometrisiyle birlikte döndürür.
export interface Asset {
  id: number
  name: string
  category: AssetCategory
  status: AssetStatus
  neighborhood: string
  geometry: Geometry
  description: string | null
  createdAt: string
  updatedAt: string | null
  // PostgreSQL'in ürettiği değerler
  latitude: number
  longitude: number
  geometryType: string
  lengthMeters: number | null
  areaSquareMeters: number | null
}

// Tablo için hafif kayıt (geometri yok).
export interface AssetListItem {
  id: number
  name: string
  category: AssetCategory
  status: AssetStatus
  neighborhood: string
  geometryType: string
  latitude: number
  longitude: number
  lengthMeters: number | null
  areaSquareMeters: number | null
  createdAt: string
}

export interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// POST / PUT gövdesi (AssetRequest.cs). id, createdAt ve hesaplanan alanlar sunucuya aittir.
export interface AssetInput {
  name: string
  category: AssetCategory
  status: AssetStatus
  neighborhood: string
  description: string | null
  geometry: Geometry
}

export interface AssetFeatureProps {
  id: number
  name: string
  category: AssetCategory
  status: AssetStatus
  neighborhood: string
  geometryType: string
  latitude: number
  longitude: number
  lengthMeters: number | null
  areaSquareMeters: number | null
}

export type AssetFeatureCollection = FeatureCollection<Geometry, AssetFeatureProps>

export interface AssetFilters {
  search: string
  categories: AssetCategory[]
  statuses: AssetStatus[]
  neighborhood: string
}

export interface AssetSort {
  sort: 'name' | 'category' | 'status' | 'neighborhood' | 'size' | 'created'
  desc: boolean
}

export interface CountItem {
  key: string
  count: number
}

export interface Summary {
  total: number
  byStatus: CountItem[]
  byCategory: CountItem[]
  byGeometryType: CountItem[]
  totalLengthKm: number
  totalAreaHectares: number
}

export interface NearbyAsset {
  id: number
  name: string
  category: AssetCategory
  status: AssetStatus
  neighborhood: string
  geometryType: string
  latitude: number
  longitude: number
  distanceMeters: number
}

export interface NeighborhoodFeatureProps {
  id: number
  name: string
  district: string
  areaKm2: number
  assetCount: number
  maintenanceCount: number
  assetsPerKm2: number
}

export type NeighborhoodFeatureCollection = FeatureCollection<Geometry, NeighborhoodFeatureProps>

export interface NeighborhoodStats {
  id: number
  name: string
  district: string
  areaKm2: number
  assetCount: number
  maintenanceCount: number
  assetsPerKm2: number
}

export interface NeighborhoodAt {
  name: string
  district: string
}
