import type { AssetCategory, AssetStatus } from './types'

export const categoryLabels: Record<AssetCategory, string> = {
  Park: 'Park',
  Road: 'Yol',
  Building: 'Bina',
  StreetLight: 'Sokak Lambası',
  Infrastructure: 'Altyapı',
}

export const statusLabels: Record<AssetStatus, string> = {
  Active: 'Aktif',
  UnderMaintenance: 'Bakımda',
  Inactive: 'Pasif',
}
