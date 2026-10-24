import { describe, expect, it } from 'vitest'
import { formatArea, formatCurrency, formatDate, formatLength } from './format'

describe('formatLength', () => {
  it('shows metres below one kilometre', () => {
    expect(formatLength(850)).toBe('850 m')
  })

  it('switches to kilometres with a turkish decimal comma', () => {
    expect(formatLength(1500)).toBe('1,5 km')
    expect(formatLength(73_900)).toBe('73,9 km')
  })

  it('returns a dash for missing values', () => {
    expect(formatLength(null)).toBe('—')
    expect(formatLength(undefined)).toBe('—')
  })
})

describe('formatArea', () => {
  it('shows square metres for small areas', () => {
    expect(formatArea(5_321)).toBe('5.321 m²')
  })

  it('switches to hectares from 1 ha upwards', () => {
    expect(formatArea(10_000)).toBe('1 ha')
    expect(formatArea(280_389)).toBe('28 ha')
    expect(formatArea(117_000)).toBe('11,7 ha')
  })

  it('returns a dash for missing values', () => {
    expect(formatArea(null)).toBe('—')
  })
})

describe('formatCurrency', () => {
  it('formats turkish lira without decimals', () => {
    expect(formatCurrency(1_422_015)).toContain('1.422.015')
    expect(formatCurrency(1_422_015)).toContain('₺')
  })

  it('returns a dash for missing values', () => {
    expect(formatCurrency(null)).toBe('—')
  })
})

describe('formatDate', () => {
  it('formats iso dates in turkish', () => {
    expect(formatDate('2026-10-24')).toMatch(/24 Ekim 2026/)
  })

  it('returns a dash for missing values', () => {
    expect(formatDate(null)).toBe('—')
  })
})
