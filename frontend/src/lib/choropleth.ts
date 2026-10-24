// Koroplet (renkli yoğunluk) haritası için sınıflandırma: değerleri kantillere böler.
export const RAMP = ['#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8', '#1e3a8a']

// Sıfırdan büyük değerlerin kantil eşiklerini (sınıfların üst sınırları) döndürür.
export function classBreaks(values: number[], classes = RAMP.length): number[] {
  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b)
  if (sorted.length === 0) return []

  const breaks: number[] = []
  for (let i = 1; i < classes; i++) {
    const value = sorted[Math.min(sorted.length - 1, Math.floor((i / classes) * sorted.length))]
    if (breaks.length === 0 || value > breaks[breaks.length - 1]) breaks.push(value)
  }
  return breaks
}

// 0 -> null (boyanmaz), aksi halde eşiğe göre rampadan renk.
export function colorFor(value: number, breaks: number[]): string | null {
  if (value <= 0) return null
  const index = breaks.findIndex((b) => value < b)
  const cls = index === -1 ? breaks.length : index
  return RAMP[Math.min(cls, RAMP.length - 1)]
}

// Lejant satırları: [renk, "1–3" gibi aralık metni]
export function legendItems(breaks: number[], max: number): { color: string; label: string }[] {
  if (max <= 0) return []
  const edges = [1, ...breaks, max + 1]
  const items: { color: string; label: string }[] = []

  for (let i = 0; i < edges.length - 1; i++) {
    const from = edges[i]
    const to = edges[i + 1] - 1
    if (to < from) continue
    items.push({ color: RAMP[Math.min(i, RAMP.length - 1)], label: from === to ? `${from}` : `${from}–${to}` })
  }
  return items
}
