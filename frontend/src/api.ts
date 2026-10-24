import type { Asset, AssetInput } from './types'

// Sunucudan dönen hatayı okunabilir bir metne çevirir.
// ASP.NET Core doğrulama hataları { errors: { Alan: ["mesaj"] } } biçiminde gelir.
async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json()
    if (body.errors) {
      return Object.values(body.errors as Record<string, string[]>).flat().join(' ')
    }
  } catch {
    // Gövde JSON değilse aşağıdaki varsayılan mesaj kullanılır.
  }
  return `Sunucu hatası: ${response.status}`
}

async function send(url: string, method: string, body?: AssetInput): Promise<void> {
  const response = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    throw new Error(await readError(response))
  }
}

export async function getAssets(signal?: AbortSignal): Promise<Asset[]> {
  const response = await fetch('/api/assets', { signal })

  if (!response.ok) {
    throw new Error(await readError(response))
  }

  return response.json()
}

export function createAsset(input: AssetInput): Promise<void> {
  return send('/api/assets', 'POST', input)
}

export function updateAsset(id: number, input: AssetInput): Promise<void> {
  return send(`/api/assets/${id}`, 'PUT', input)
}

export function deleteAsset(id: number): Promise<void> {
  return send(`/api/assets/${id}`, 'DELETE')
}
