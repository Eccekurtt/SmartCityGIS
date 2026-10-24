// Sunucu hatası: HTTP durumunu ve (varsa) alan bazlı doğrulama mesajlarını taşır.
export class ApiError extends Error {
  status: number
  fieldErrors: Record<string, string[]>

  constructor(message: string, status: number, fieldErrors: Record<string, string[]> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

// ASP.NET Core ProblemDetails / ValidationProblemDetails gövdesini okunabilir hataya çevirir.
async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = await response.json()
    const fieldErrors: Record<string, string[]> = body.errors ?? {}
    const messages = Object.values(fieldErrors).flat()
    const message = messages.length > 0 ? messages.join(' ') : (body.detail ?? body.title ?? '')
    if (message) return new ApiError(message, response.status, fieldErrors)
  } catch {
    // Gövde JSON değil; aşağıdaki varsayılan mesaj kullanılır.
  }
  return new ApiError(`Sunucu hatası (${response.status}).`, response.status)
}

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)

  if (!response.ok) {
    throw await toApiError(response)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function jsonBody(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

// Dizi parametrelerini tekrarlı anahtarlarla yazar: ?category=Park&category=Road
export function toQuery(params: Record<string, string | number | boolean | string[] | undefined | null>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue
    if (Array.isArray(value)) value.forEach((v) => search.append(key, v))
    else search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}
