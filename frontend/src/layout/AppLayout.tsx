import { Outlet } from 'react-router-dom'
import { Header } from '../components/Header'

export function AppLayout() {
  return (
    <>
      <Header />
      <main className="container">
        <Outlet />
        <footer className="footer">
          SmartCity GIS · ASP.NET Core · PostgreSQL/PostGIS · React · Leaflet · Harita verisi © OpenStreetMap
          katkıda bulunanlar
        </footer>
      </main>
    </>
  )
}
