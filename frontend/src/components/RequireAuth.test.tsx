import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { tokenStore } from '../api/client'
import { AuthProvider } from '../context/AuthContext'
import { usePermissions } from '../hooks/usePermissions'
import { RequireAdmin, RequireAuth } from './RequireAuth'

function renderAt(path: string) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <Routes>
            <Route path="/giris" element={<div>Giriş sayfası</div>} />
            <Route element={<RequireAuth />}>
              <Route path="/" element={<div>Gizli içerik</div>} />
              <Route element={<RequireAdmin />}>
                <Route path="/denetim" element={<div>Denetim kaydı</div>} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const stubMe = (role: 'Viewer' | 'Operator' | 'Admin') =>
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 1, userName: 'u', displayName: 'U', role }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  )

afterEach(() => vi.unstubAllGlobals())

describe('route protection', () => {
  it('redirects anonymous visitors to the login page', async () => {
    renderAt('/')

    expect(await screen.findByText('Giriş sayfası')).toBeInTheDocument()
    expect(screen.queryByText('Gizli içerik')).not.toBeInTheDocument()
  })

  it('lets a signed-in user see protected content', async () => {
    tokenStore.set('token')
    stubMe('Viewer')

    renderAt('/')

    expect(await screen.findByText('Gizli içerik')).toBeInTheDocument()
  })

  it('blocks non-admins from admin pages', async () => {
    tokenStore.set('token')
    stubMe('Operator')

    renderAt('/denetim')

    expect(await screen.findByText('Yetkiniz yok')).toBeInTheDocument()
    expect(screen.queryByText('Denetim kaydı')).not.toBeInTheDocument()
  })

  it('allows admins into admin pages', async () => {
    tokenStore.set('token')
    stubMe('Admin')

    renderAt('/denetim')

    expect(await screen.findByText('Denetim kaydı')).toBeInTheDocument()
  })

  it('signs the user out when the stored token is rejected', async () => {
    tokenStore.set('expired')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })))

    renderAt('/')

    expect(await screen.findByText('Giriş sayfası')).toBeInTheDocument()
    await waitFor(() => expect(tokenStore.get()).toBeNull())
  })
})

describe('usePermissions', () => {
  function Probe() {
    const p = usePermissions()
    return <div>{`write=${p.canWrite} delete=${p.canDelete} admin=${p.isAdmin}`}</div>
  }

  async function permissionsFor(role: 'Viewer' | 'Operator' | 'Admin') {
    tokenStore.set('token')
    stubMe(role)
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <AuthProvider>
            <Probe />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getByText(/write=/)).toHaveTextContent(role === 'Viewer' ? 'write=false' : 'write=true'))
    return screen.getByText(/write=/).textContent
  }

  it('maps roles to capabilities', async () => {
    expect(await permissionsFor('Viewer')).toBe('write=false delete=false admin=false')
  })

  it('lets operators write but not delete', async () => {
    expect(await permissionsFor('Operator')).toBe('write=true delete=false admin=false')
  })

  it('lets admins do everything', async () => {
    expect(await permissionsFor('Admin')).toBe('write=true delete=true admin=true')
  })
})
