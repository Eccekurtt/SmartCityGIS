import { useCallback, useEffect, useMemo, useState } from 'react'
import { createAsset, deleteAsset, getAssets, updateAsset } from './api'
import { AssetForm } from './components/AssetForm'
import { AssetMap } from './components/AssetMap'
import { AssetTable } from './components/AssetTable'
import { ConfirmDialog } from './components/ConfirmDialog'
import { Header } from './components/Header'
import { SearchIcon } from './components/icons'
import { Modal } from './components/Modal'
import { StatCards } from './components/StatCards'
import { Toast } from './components/Toast'
import type { ToastMessage } from './components/Toast'
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
  const [deleting, setDeleting] = useState<Asset | null>(null)
  // Harita ve tablo aynı seçimi paylaşır.
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)

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

  // Ekleme / düzenleme / silme sonrası ve "Tekrar dene" ile listeyi sunucudan yeniden çeker.
  async function reload() {
    try {
      setAssets(await getAssets())
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
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

  const hasFilters = search !== '' || category !== '' || status !== ''
  const dismissToast = useCallback(() => setToast(null), [])

  function clearFilters() {
    setSearch('')
    setCategory('')
    setStatus('')
  }

  async function handleSubmit(input: AssetInput) {
    const isEdit = form !== null && form !== 'new'
    if (isEdit) {
      await updateAsset(form.id, input)
    } else {
      await createAsset(input)
    }
    setForm(null)
    setToast({ type: 'success', text: isEdit ? 'Varlık güncellendi.' : 'Varlık eklendi.' })
    await reload()
  }

  async function handleDelete() {
    if (!deleting) return

    try {
      await deleteAsset(deleting.id)
      if (selectedId === deleting.id) setSelectedId(null)
      setToast({ type: 'success', text: `"${deleting.name}" silindi.` })
      await reload()
    } catch (err) {
      setToast({ type: 'error', text: (err as Error).message })
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      <Header onNew={() => setForm('new')} disabled={form !== null} />

      <main className="container">
        <StatCards assets={assets} loading={loading} />

        {error && (
          <div className="card banner-error" role="alert">
            <div>
              <strong>Veriler alınamadı.</strong> {error}
            </div>
            <button className="btn" onClick={reload}>
              Tekrar dene
            </button>
          </div>
        )}

        <section className="card toolbar" aria-label="Arama ve filtreler">
          <label className="search">
            <SearchIcon size={16} />
            <input
              type="search"
              placeholder="Ad veya mahalle ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            aria-label="Kategori"
            value={category}
            onChange={(e) => setCategory(e.target.value as AssetCategory | '')}
          >
            <option value="">Tüm kategoriler</option>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Durum"
            value={status}
            onChange={(e) => setStatus(e.target.value as AssetStatus | '')}
          >
            <option value="">Tüm durumlar</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {hasFilters && (
            <button className="btn ghost" onClick={clearFilters}>
              Temizle
            </button>
          )}
          <span className="count">
            <strong>{filtered.length}</strong> / {assets.length} varlık
          </span>
        </section>

        <section className="card map-card" aria-label="Harita">
          <AssetMap assets={filtered} selectedId={selectedId} onSelect={setSelectedId} />
        </section>

        <section className="card table-card" aria-label="Varlık listesi">
          <AssetTable
            assets={filtered}
            loading={loading}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onEdit={setForm}
            onDelete={setDeleting}
          />
        </section>

        <footer className="footer">
          SmartCity GIS · ASP.NET Core · PostgreSQL/PostGIS · React · Leaflet · Harita verisi ©
          OpenStreetMap katkıda bulunanlar
        </footer>
      </main>

      {form !== null && (
        <Modal title={form === 'new' ? 'Yeni Varlık' : 'Varlığı Düzenle'} onClose={() => setForm(null)}>
          <AssetForm
            key={form === 'new' ? 'new' : form.id}
            asset={form === 'new' ? null : form}
            onSubmit={handleSubmit}
            onCancel={() => setForm(null)}
          />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Varlığı sil"
          message={`"${deleting.name}" kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
          confirmLabel="Sil"
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      {toast && <Toast toast={toast} onDismiss={dismissToast} />}
    </>
  )
}

export default App
