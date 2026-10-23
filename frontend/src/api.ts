import type { Asset } from './types'

export async function getAssets(signal?: AbortSignal): Promise<Asset[]> {
  const response = await fetch('/api/assets', { signal })

  if (!response.ok) {
    throw new Error(`Sunucu hatası: ${response.status}`)
  }

  return response.json()
}
