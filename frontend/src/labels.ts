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
