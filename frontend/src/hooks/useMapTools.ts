import { useCallback, useState } from 'react'

export type Tool = null | 'nearby' | 'measure'
export type MeasureMode = 'line' | 'area'

// Harita araçlarının durumu. AssetMap tek bir kez çağırır; katmanlar harita içinde, paneller haritanın üstünde çizilir.
export function useMapTools() {
  const [tool, setTool] = useState<Tool>(null)
  const [origin, setOrigin] = useState<{ lat: number; lon: number } | null>(null)
  const [radius, setRadius] = useState(1000)
  const [mode, setMode] = useState<MeasureMode>('line')
  const [points, setPoints] = useState<[number, number][]>([]) // [enlem, boylam]

  const choose = useCallback((next: Tool) => {
    setTool((current) => (current === next ? null : next))
    setPoints([])
  }, [])

  const close = useCallback(() => {
    setTool(null)
    setPoints([])
  }, [])

  return { tool, origin, setOrigin, radius, setRadius, mode, setMode, points, setPoints, choose, close }
}

export type MapTools = ReturnType<typeof useMapTools>
