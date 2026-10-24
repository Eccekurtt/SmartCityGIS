import { Route, Routes } from 'react-router-dom'
import { RequireAdmin, RequireAuth } from './components/RequireAuth'
import { AppLayout } from './layout/AppLayout'
import { AuditPage } from './pages/AuditPage'
import { DashboardPage } from './pages/DashboardPage'
import { DataPage } from './pages/DataPage'
import { LoginPage } from './pages/LoginPage'
import { MaintenancePage } from './pages/MaintenancePage'
import { MapPage } from './pages/MapPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { UsersPage } from './pages/UsersPage'

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
