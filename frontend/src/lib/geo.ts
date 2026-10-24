import area from '@turf/area'
import { feature } from '@turf/helpers'
import length from '@turf/length'
import type { Geometry, Position } from 'geojson'
import L from 'leaflet'

// GeoJSON sırası [boylam, enlem]; Leaflet sırası [enlem, boylam].
export const flip = (p: Position): [number, number] => [p[1], p[0]]

export const flipLine = (line: Position[]) => line.map(flip)

export const flipPolygon = (rings: Position[][]) => rings.map(flipLine)

// Çizginin jeodezik uzunluğu (metre).
export function lineLengthMeters(coordinates: Position[]): number {
  if (coordinates.length < 2) return 0
  return length(feature({ type: 'LineString', coordinates }), { units: 'meters' })
}

// Alanın jeodezik büyüklüğü (m²).
export function polygonAreaSquareMeters(ring: Position[]): number {
  if (ring.length < 3) return 0
  const closed = [...ring, ring[0]]
  return area(feature({ type: 'Polygon', coordinates: [closed] }))
}

// Geometrinin harita sınırları (Leaflet LatLngBounds).
export function geometryBounds(geometry: Geometry): L.LatLngBounds {
  return L.geoJSON(geometry).getBounds()
}
