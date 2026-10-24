import { useEffect, useMemo, useState } from 'react'
import { createAsset, deleteAsset, getAssets, updateAsset } from './api'
import { AssetForm } from './components/AssetForm'
import { AssetMap } from './components/AssetMap'
import { AssetTable } from './components/AssetTable'
import { categoryLabels, statusLabels } from './labels'
import type { Asset, AssetCategory, AssetInput, AssetStatus } from './types'

// null = form kapalı, 'new' = yeni kayıt, Asset = düzenleme
type FormState = null | 'new' | Asset

function App() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<AssetCategory | ''>('')
  const [status, setStatus] = useState<AssetStatus | ''>('')

  const [form, setForm] = useState<FormState>(null)
  // Harita ve tablo aynı seçimi paylaşır.
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // İlk yükleme.
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

  // Ekleme / düzenleme / silme sonrası listeyi sunucudan yeniden çeker.
  async function reload() {
    try {
      setAssets(await getAssets())
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  // Filtreleme tarayıcıda yapılır; assets / filtreler değişmedikçe yeniden hesaplanmaz.
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('tr')
    return assets.filter(
      (a) =>
        (term === '' ||
          a.name.toLocaleLowerCase('tr').includes(term) ||
          a.neighborhood.toLocaleLowerCase('tr').includes(term)) &&
        (category === '' || a.category === category) &&
        (status === '' || a.status === status),
    )
  }, [assets, search, category, status])

  async function handleSubmit(input: AssetInput) {
    if (form && form !== 'new') {
      await updateAsset(form.id, input)
    } else {
      await createAsset(input)
    }
    setForm(null)
    await reload()
  }

  async function handleDelete(asset: Asset) {
    if (!window.confirm(`"${asset.name}" silinsin mi?`)) return

    try {
      await deleteAsset(asset.id)
      if (selectedId === asset.id) setSelectedId(null)
      await reload()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <main className="container">
      <header className="header">
        <div>
          <h1>SmartCity GIS</h1>
          <p className="subtitle">Belediye Varlık Yönetim Sistemi</p>
        </div>
        <button className="primary" onClick={() => setForm('new')} disabled={form !== null}>
          + Yeni Varlık
        </button>
      </header>

      {form !== null && (
        <AssetForm
          key={form === 'new' ? 'new' : form.id}
          asset={form === 'new' ? null : form}
          onSubmit={handleSubmit}
          onCancel={() => setForm(null)}
        />
      )}

      <div className="filters">
        <input
          type="search"
          placeholder="Ad veya mahalle ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value as AssetCategory | '')}>
          <option value="">Tüm kategoriler</option>
          {Object.entries(categoryLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as AssetStatus | '')}>
          <option value="">Tüm durumlar</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <span className="count">
          {filtered.length} / {assets.length} kayıt
        </span>
      </div>

      {loading && <p>Yükleniyor...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && (
        <>
          <AssetMap assets={filtered} selectedId={selectedId} onSelect={setSelectedId} />
          <AssetTable
            assets={filtered}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onEdit={setForm}
            onDelete={handleDelete}
          />
        </>
      )}
    </main>
  )
}

export default App
