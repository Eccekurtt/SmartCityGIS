import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, request, setUnauthorizedHandler, tokenStore, toQuery } from './client'

describe('toQuery', () => {
  it('repeats array parameters and skips empty values', () => {
    const query = toQuery({ search: 'park', category: ['Park', 'Road'], status: [], neighborhood: '', page: 2, flag: false })

    expect(query).toBe('?search=park&category=Park&category=Road&page=2')
  })

  it('returns an empty string when nothing is set', () => {
    expect(toQuery({ a: undefined, b: null, c: '' })).toBe('')
  })
})

describe('request', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setUnauthorizedHandler(null)
  })

  const respond = (status: number, body?: unknown) =>
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
    )

  it('sends the bearer token when a session exists', async () => {
    tokenStore.set('abc.def.ghi')
    respond(200, { ok: true })

    await request('/api/assets')

    const init = vi.mocked(fetch).mock.calls[0][1]
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer abc.def.ghi')
  })

  it('sends no Authorization header without a session', async () => {
    respond(200, [])

    await request('/api/assets')

    const init = vi.mocked(fetch).mock.calls[0][1]
    expect(new Headers(init?.headers).has('Authorization')).toBe(false)
  })

  it('returns undefined for 204 responses', async () => {
    respond(204)

    await expect(request('/api/assets/1', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('turns validation problems into an ApiError with field messages', async () => {
    respond(400, { title: 'Doğrulama hatası', errors: { Name: ['Ad zorunludur.'], Geometry: ['Geometri zorunludur.'] } })

    const error = await request('/api/assets', { method: 'POST' }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(400)
    expect((error as ApiError).message).toBe('Ad zorunludur. Geometri zorunludur.')
    expect((error as ApiError).fieldErrors.Name).toEqual(['Ad zorunludur.'])
  })

  it('falls back to a generic message when the body is not json', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('<html>boom</html>', { status: 500 }))

    await expect(request('/api/x')).rejects.toThrow('Sunucu hatası (500).')
  })

  it('notifies the unauthorized handler when a signed-in request gets 401', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    tokenStore.set('expired-token')
    respond(401, { title: 'Unauthorized' })

    await request('/api/assets').catch(() => undefined)

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not trigger the handler for a failed login (no session yet)', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    respond(401, { detail: 'Kullanıcı adı veya parola hatalı.' })

    await request('/api/auth/login', { method: 'POST' }).catch(() => undefined)

    expect(handler).not.toHaveBeenCalled()
  })
})
