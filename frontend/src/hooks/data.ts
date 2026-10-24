import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  importOsmAssets,
  importOsmNeighborhoods,
  reassignNeighborhoods,
  uploadGeoJson,
} from '../api/data'
import type { OsmKind } from '../types'

// Veri değişince her şey (varlıklar, harita, mahalle istatistikleri, raporlar) yenilenir.
function useRefreshAll() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries()
}

export function useGeoJsonUpload() {
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: ({ file, dryRun }: { file: File; dryRun: boolean }) => uploadGeoJson(file, dryRun),
    onSuccess: (_report, { dryRun }) => (dryRun ? undefined : refresh()),
  })
}

export function useOsmNeighborhoodImport() {
  const refresh = useRefreshAll()
  return useMutation({ mutationFn: (district: string) => importOsmNeighborhoods(district), onSuccess: refresh })
}

export function useOsmAssetImport() {
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: ({ district, kinds, maxPerKind }: { district: string; kinds: OsmKind[]; maxPerKind: number }) =>
      importOsmAssets(district, kinds, maxPerKind),
    onSuccess: refresh,
  })
}

export function useReassignNeighborhoods() {
  const refresh = useRefreshAll()
  return useMutation({ mutationFn: reassignNeighborhoods, onSuccess: refresh })
}
