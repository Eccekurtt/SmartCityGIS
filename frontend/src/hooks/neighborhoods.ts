import { useQuery } from '@tanstack/react-query'
import { getNeighborhoodAt, getNeighborhoodGeoJson, getNeighborhoodStats } from '../api/neighborhoods'

// Mahalle sınırları büyük olduğu için yalnızca katman açıldığında (enabled) çekilir.
export function useNeighborhoodGeoJson(enabled: boolean) {
  return useQuery({
    queryKey: ['neighborhoods', 'geojson'],
    queryFn: ({ signal }) => getNeighborhoodGeoJson(signal),
    enabled,
    staleTime: 60_000,
  })
}

export function useNeighborhoodStats(district?: string) {
  return useQuery({
    queryKey: ['neighborhoods', 'stats', district ?? ''],
    queryFn: ({ signal }) => getNeighborhoodStats(district, signal),
  })
}

export function useNeighborhoodAt(lat: number | null, lon: number | null) {
  return useQuery({
    queryKey: ['neighborhoods', 'at', lat, lon],
    queryFn: ({ signal }) => getNeighborhoodAt(lat as number, lon as number, signal),
    enabled: lat !== null && lon !== null,
    staleTime: 5 * 60_000,
  })
}
