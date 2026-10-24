import { describe, expect, it } from 'vitest'
import { RAMP, classBreaks, colorFor, legendItems } from './choropleth'

describe('classBreaks', () => {
  it('ignores zero values and returns increasing thresholds', () => {
    const breaks = classBreaks([0, 0, 1, 1, 2, 3, 4, 6, 8, 12, 20, 33])

    expect(breaks.length).toBeGreaterThan(0)
    expect(breaks.length).toBeLessThan(RAMP.length)
    expect([...breaks].sort((a, b) => a - b)).toEqual(breaks)
    expect(new Set(breaks).size).toBe(breaks.length)
  })

  it('returns no thresholds when everything is zero', () => {
    expect(classBreaks([0, 0, 0])).toEqual([])
  })
})

describe('colorFor', () => {
  const breaks = [3, 6, 10, 20]

  it('does not paint empty areas', () => {
    expect(colorFor(0, breaks)).toBeNull()
  })

  it('picks the lightest colour for the lowest class and the darkest for the highest', () => {
    expect(colorFor(1, breaks)).toBe(RAMP[0])
    expect(colorFor(100, breaks)).toBe(RAMP[4])
  })

  it('moves to the next colour at each threshold', () => {
    expect(colorFor(2, breaks)).toBe(RAMP[0])
    expect(colorFor(3, breaks)).toBe(RAMP[1])
    expect(colorFor(10, breaks)).toBe(RAMP[3])
  })
})

describe('legendItems', () => {
  it('builds contiguous labelled ranges that cover 1..max', () => {
    const items = legendItems([3, 6, 10], 33)

    expect(items.map((i) => i.label)).toEqual(['1–2', '3–5', '6–9', '10–33'])
  })

  it('returns nothing when there is no data', () => {
    expect(legendItems([], 0)).toEqual([])
  })
})
