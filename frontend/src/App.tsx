import { useEffect, useState } from 'react'
import { getAssets } from './api'
import type { Asset } from './types'

function App() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    getAssets(controller.signal)
      .then(setAssets)
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => setLoading(false))

    // Bileşen kaldırılırsa devam eden isteği iptal et.
    return () => controller.abort()
  }, [])

  return (
    <main className="container">
      <h1>SmartCity GIS</h1>
      <p className="subtitle">Belediye Varlık Yönetim Sistemi</p>

      {loading && <p>Yükleniyor...</p>}
      {error && <p className="error">Veriler alınamadı: {error}</p>}

      {!loading && !error && (
        <table>
          <thead>
            <tr>
              <th>Ad</th>
              <th>Kategori</th>
              <th>Durum</th>
              <th>Mahalle</th>
              <th>Konum</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id}>
                <td>{asset.name}</td>
                <td>{asset.category}</td>
                <td>
                  <span className={`badge badge-${asset.status}`}>{asset.status}</span>
                </td>
                <td>{asset.neighborhood}</td>
                <td>
                  {asset.latitude.toFixed(4)}, {asset.longitude.toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}

export default App
