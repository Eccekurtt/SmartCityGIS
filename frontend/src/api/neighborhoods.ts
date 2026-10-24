import type { NeighborhoodAt, NeighborhoodFeatureCollection, NeighborhoodStats } from '../types'
import { request, toQuery } from './client'

export function getNeighborhoodGeoJson(signal?: AbortSignal) {
  return request<NeighborhoodFeatureCollection>('/api/neighborhoods/geojson', { signal })
}

export function getNeighborhoodStats(district?: string, signal?: AbortSignal) {
  return request<NeighborhoodStats[]>(`/api/neighborhoods${toQuery({ district })}`, { signal })
}

// Nokta hiçbir mahalleye düşmezse sunucu 404 döner; bunu "bulunamadı" (null) olarak ele alırız.
export async function getNeighborhoodAt(lat: number, lon: number, signal?: AbortSignal) {
  try {
    return await request<NeighborhoodAt>(`/api/neighborhoods/at${toQuery({ lat, lon })}`, { signal })
  } catch (error) {
    if ((error as { status?: number }).status === 404) return null
    throw error
  }
}
