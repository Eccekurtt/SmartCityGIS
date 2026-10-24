import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePermissions } from '../hooks/usePermissions'

// Giriş yapmamış kullanıcıyı giriş sayfasına yönlendirir; girişten sonra kaldığı sayfaya döner.
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <div className="splash">Oturum doğrulanıyor…</div>
  if (status === 'anonymous') {
    return <Navigate to="/giris" replace state={{ from: location.pathname + location.search }} />
  }

  return <Outlet />
}

// Yalnızca yöneticilerin görebileceği sayfalar için.
export function RequireAdmin() {
  const { isAdmin } = usePermissions()

  if (!isAdmin) {
    return (
      <div className="card not-found">
        <h1>Yetkiniz yok</h1>
        <p>Bu sayfa yalnızca sistem yöneticileri içindir.</p>
      </div>
    )
  }

  return <Outlet />
}
