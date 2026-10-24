import type {
  AssetCategory,
  AssetStatus,
  MaintenancePriority,
  MaintenanceStatus,
  MaintenanceType,
  UserRole,
} from './types'

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

// ---- Bakım ----
export const maintenanceTypeLabels: Record<MaintenanceType, string> = {
  Routine: 'Periyodik bakım',
  Repair: 'Onarım',
  Inspection: 'Denetim',
  Replacement: 'Parça değişimi',
  Emergency: 'Acil müdahale',
}

export const maintenanceStatusLabels: Record<MaintenanceStatus, string> = {
  Planned: 'Planlandı',
  InProgress: 'Devam ediyor',
  Completed: 'Tamamlandı',
  Cancelled: 'İptal edildi',
}

export const maintenanceStatusColors: Record<MaintenanceStatus, string> = {
  Planned: '#2563eb',
  InProgress: '#d97706',
  Completed: '#16a34a',
  Cancelled: '#64748b',
}

export const priorityLabels: Record<MaintenancePriority, string> = {
  Low: 'Düşük',
  Normal: 'Normal',
  High: 'Yüksek',
  Critical: 'Kritik',
}

export const priorityColors: Record<MaintenancePriority, string> = {
  Low: '#64748b',
  Normal: '#2563eb',
  High: '#d97706',
  Critical: '#dc2626',
}

export const maintenanceTypes = Object.keys(maintenanceTypeLabels) as MaintenanceType[]
export const maintenanceStatuses = Object.keys(maintenanceStatusLabels) as MaintenanceStatus[]
export const priorities = Object.keys(priorityLabels) as MaintenancePriority[]

// ---- Kullanıcılar ve denetim ----
export const roleLabels: Record<UserRole, string> = {
  Viewer: 'İzleyici',
  Operator: 'Operatör',
  Admin: 'Yönetici',
}

export const auditActionLabels: Record<string, string> = {
  Create: 'Oluşturma',
  Update: 'Güncelleme',
  Delete: 'Silme',
  Login: 'Giriş',
  LoginFailed: 'Başarısız giriş',
}

export const auditEntityLabels: Record<string, string> = {
  Asset: 'Varlık',
  MaintenanceRecord: 'Bakım kaydı',
  Neighborhood: 'Mahalle',
  AppUser: 'Kullanıcı',
  Auth: 'Oturum',
}
