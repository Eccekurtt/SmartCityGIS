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

// ---- Oturum (JWT) ----
// Token sekme kapanınca silinen sessionStorage'da tutulur. (Not: tarayıcı depolaması XSS'e açıktır;
// bu projede içerik güvenliği için kullanıcı girdisi React tarafından kaçışlanır ve harici betik yüklenmez.)
const TOKEN_KEY = 'smartcity.token'

export const tokenStore = {
  get: (): string | null => {
    try {
      return sessionStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set: (token: string) => {
    try {
      sessionStorage.setItem(TOKEN_KEY, token)
    } catch {
      // depolama kapalıysa oturum yalnızca bu sayfa yüklemesi boyunca çalışmaz; sessizce geç
    }
  },
  clear: () => {
    try {
      sessionStorage.removeItem(TOKEN_KEY)
    } catch {
      // yoksay
    }
  },
}

// 401 alınınca (süresi dolmuş/geçersiz token) AuthContext burayı çağırarak oturumu kapatır.
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

function withAuth(init?: RequestInit): RequestInit {
  const token = tokenStore.get()
  if (!token) return init ?? {}

  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Bearer ${token}`)
  return { ...init, headers }
}

// Kimlik gerektiren isteği atar; başarısızlıkta ApiError fırlatır.
export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const hadToken = tokenStore.get() !== null
  const response = await fetch(url, withAuth(init))

  if (response.status === 401 && hadToken) onUnauthorized?.()
  if (!response.ok) throw await toApiError(response)

  return response
}

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await authFetch(url, init)

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
