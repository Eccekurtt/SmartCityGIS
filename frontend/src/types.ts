// Backend'deki Asset modelinin JSON karşılığı (AssetEnums.cs ile aynı değerler).
export type AssetCategory = 'Park' | 'Road' | 'Building' | 'StreetLight' | 'Infrastructure'

export type AssetStatus = 'Active' | 'UnderMaintenance' | 'Inactive'

export interface Asset {
  id: number
  name: string
  category: AssetCategory
  status: AssetStatus
  neighborhood: string
  latitude: number
  longitude: number
  description: string | null
  createdAt: string
}
