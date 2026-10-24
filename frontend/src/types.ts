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
  source: string
  externalId: string | null
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

// ---- Bakım ----
export type MaintenanceType = 'Routine' | 'Repair' | 'Inspection' | 'Replacement' | 'Emergency'
export type MaintenanceStatus = 'Planned' | 'InProgress' | 'Completed' | 'Cancelled'
export type MaintenancePriority = 'Low' | 'Normal' | 'High' | 'Critical'

export interface MaintenanceRecord {
  id: number
  assetId: number
  assetName: string
  assetCategory: AssetCategory
  title: string
  type: MaintenanceType
  priority: MaintenancePriority
  status: MaintenanceStatus
  scheduledDate: string // "2026-10-24"
  startedAt: string | null
  completedAt: string | null
  description: string | null
  technician: string | null
  cost: number | null
  isOverdue: boolean
  createdAt: string
}

export interface MaintenanceInput {
  title: string
  type: MaintenanceType
  priority: MaintenancePriority
  scheduledDate: string
  description: string | null
  technician: string | null
  cost: number | null
}

export interface MaintenanceSummary {
  planned: number
  inProgress: number
  overdue: number
  dueNext7Days: number
  completedLast30Days: number
  costLast30Days: number
}

export interface MaintenanceFilters {
  statuses: MaintenanceStatus[]
  types: MaintenanceType[]
  overdueOnly: boolean
  search: string
}

// ---- Rapor paneli ----
export interface NeighborhoodCount {
  name: string
  assets: number
  underMaintenance: number
}

export interface MonthlyPoint {
  month: string // "2026-10"
  completed: number
  cost: number
}

export interface UpcomingItem {
  id: number
  assetId: number
  assetName: string
  title: string
  type: MaintenanceType
  priority: MaintenancePriority
  scheduledDate: string
  isOverdue: boolean
}

export interface Dashboard {
  summary: Summary
  topNeighborhoods: NeighborhoodCount[]
  maintenanceByMonth: MonthlyPoint[]
  maintenanceByType: CountItem[]
  maintenanceByStatus: CountItem[]
  upcoming: UpcomingItem[]
  overdueCount: number
  costLast12Months: number
  avgCompletionDays: number | null
  assetsNeverMaintained: number
}

// ---- İçe / dışa aktarma ----
export type OsmKind = 'Parks' | 'Roads' | 'StreetLights' | 'PublicBuildings' | 'Infrastructure'

export interface GeoJsonRowResult {
  index: number
  name: string | null
  ok: boolean
  message: string | null
}

export interface GeoJsonImportReport {
  total: number
  valid: number
  invalid: number
  created: number
  dryRun: boolean
  problems: GeoJsonRowResult[]
}

export interface ImportResult {
  created: number
  updated: number
  skipped: number
  invalid: number
  byKind: Record<string, number>
  messages: string[]
}
