import { Route, Routes } from 'react-router-dom'
import { AppLayout } from './layout/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { MaintenancePage } from './pages/MaintenancePage'
import { MapPage } from './pages/MapPage'
import { NotFoundPage } from './pages/NotFoundPage'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<MapPage />} />
        <Route path="panel" element={<DashboardPage />} />
        <Route path="bakim" element={<MaintenancePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
