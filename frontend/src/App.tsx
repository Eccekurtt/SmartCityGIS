import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { RequireAdmin, RequireAuth } from './components/RequireAuth'
import { AppLayout } from './layout/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'

// Ağır kütüphaneler (Leaflet, Recharts) yalnızca ilgili sayfa açılınca yüklenir (kod bölme).
const MapPage = lazy(() => import('./pages/MapPage').then((m) => ({ default: m.MapPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const MaintenancePage = lazy(() => import('./pages/MaintenancePage').then((m) => ({ default: m.MaintenancePage })))
const DataPage = lazy(() => import('./pages/DataPage').then((m) => ({ default: m.DataPage })))
const UsersPage = lazy(() => import('./pages/UsersPage').then((m) => ({ default: m.UsersPage })))
const AuditPage = lazy(() => import('./pages/AuditPage').then((m) => ({ default: m.AuditPage })))

function App() {
  return (
    <Routes>
      <Route path="giris" element={<LoginPage />} />

      {/* Aşağıdakilerin hepsi oturum açmayı gerektirir. */}
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<MapPage />} />
          <Route path="panel" element={<DashboardPage />} />
          <Route path="bakim" element={<MaintenancePage />} />
          <Route path="veri" element={<DataPage />} />

          <Route element={<RequireAdmin />}>
            <Route path="kullanicilar" element={<UsersPage />} />
            <Route path="denetim" element={<AuditPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
