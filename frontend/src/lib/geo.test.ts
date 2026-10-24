import { describe, expect, it } from 'vitest'
import { flip, flipLine, flipPolygon, lineLengthMeters, polygonAreaSquareMeters } from './geo'

describe('coordinate order', () => {
  it('flips GeoJSON [lon, lat] to Leaflet [lat, lon]', () => {
    expect(flip([32.85, 39.92])).toEqual([39.92, 32.85])
    expect(flipLine([[1, 2], [3, 4]])).toEqual([[2, 1], [4, 3]])
    expect(flipPolygon([[[1, 2], [3, 4]]])).toEqual([[[2, 1], [4, 3]]])
  })
})

describe('geodesic measurements', () => {
  it('measures a ~1.4 km diagonal line close to the PostGIS value', () => {
    const meters = lineLengthMeters([[32.85, 39.92], [32.86, 39.93]])

    expect(meters).toBeGreaterThan(1_350)
    expect(meters).toBeLessThan(1_450)
  })

  it('returns 0 for a line with fewer than two points', () => {
    expect(lineLengthMeters([[32.85, 39.92]])).toBe(0)
  })

  it('measures a 0.01 x 0.01 degree square at latitude 39.9 as roughly 0.95 km²', () => {
    const area = polygonAreaSquareMeters([[32.8, 39.9], [32.81, 39.9], [32.81, 39.91], [32.8, 39.91]])

    expect(area).toBeGreaterThan(930_000)
    expect(area).toBeLessThan(970_000)
  })

  it('returns 0 for fewer than three vertices', () => {
    expect(polygonAreaSquareMeters([[32.8, 39.9], [32.81, 39.9]])).toBe(0)
  })
})
