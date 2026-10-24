const number = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 })
const integer = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })

export function formatLength(meters: number | null | undefined): string {
  if (meters == null) return '—'
  return meters >= 1000 ? `${number.format(meters / 1000)} km` : `${integer.format(meters)} m`
}

export function formatArea(squareMeters: number | null | undefined): string {
  if (squareMeters == null) return '—'
  return squareMeters >= 10_000
    ? `${number.format(squareMeters / 10_000)} ha`
    : `${integer.format(squareMeters)} m²`
}

export function formatDistance(meters: number): string {
  return formatLength(meters)
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value)
}
