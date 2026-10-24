import { useMemo } from 'react'
import { Polygon, Tooltip } from 'react-leaflet'
import { colorFor } from '../lib/choropleth'
import { flipPolygon } from '../lib/geo'
import type { NeighborhoodFeatureCollection } from '../types'

interface Props {
  collection: NeighborhoodFeatureCollection
  breaks: number[]
  onPick?: (name: string) => void
}

export function NeighborhoodLayer({ collection, breaks, onPick }: Props) {
  const features = useMemo(
    () => collection.features.filter((f) => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'),
    [collection],
  )

  return (
    <>
      {features.map((feature) => {
        const p = feature.properties
        const fill = colorFor(p.assetCount, breaks)
        const geometry = feature.geometry
        const positions =
          geometry.type === 'Polygon'
            ? flipPolygon(geometry.coordinates)
            : geometry.type === 'MultiPolygon'
              ? geometry.coordinates.map(flipPolygon)
              : []

        return (
          <Polygon
            key={p.id}
            positions={positions}
            pane="neighborhoods"
            pathOptions={{
              color: '#334155',
              weight: 1,
              opacity: 0.55,
              fillColor: fill ?? '#ffffff',
              fillOpacity: fill ? 0.5 : 0.04,
            }}
            eventHandlers={{ click: () => onPick?.(p.name) }}
          >
            <Tooltip sticky>
              <strong>{p.name}</strong> ({p.district})
              <br />
              {p.assetCount} varlık · {p.maintenanceCount} bakımda
              <br />
              {p.areaKm2.toLocaleString('tr-TR')} km²
            </Tooltip>
          </Polygon>
        )
      })}
    </>
  )
}
