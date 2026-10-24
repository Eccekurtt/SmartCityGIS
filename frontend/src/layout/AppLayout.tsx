import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from '../components/Header'

export function AppLayout() {
  return (
    <>
      <Header />
      <main className="container">
        {/* Sayfa kodu yüklenirken üst bar yerinde kalır, yalnızca içerik alanı bekler. */}
        <Suspense fallback={<div className="splash">Yükleniyor…</div>}>
          <Outlet />
        </Suspense>
        <footer className="footer">
          SmartCity GIS · ASP.NET Core · PostgreSQL/PostGIS · React · Leaflet · Harita verisi © OpenStreetMap
          katkıda bulunanlar
        </footer>
      </main>
    </>
  )
}
