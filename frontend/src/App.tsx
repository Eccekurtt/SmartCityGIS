import { useCallback, useMemo, useState } from 'react'
import { AssetDetail } from './components/AssetDetail'
import { AssetFormModal } from './components/AssetFormModal'
import { AssetMap } from './components/AssetMap'
import { AssetTable } from './components/AssetTable'
import { ConfirmDialog } from './components/ConfirmDialog'
import { FilterBar } from './components/FilterBar'
import { Header } from './components/Header'
import { Pagination } from './components/Pagination'
import { StatCards } from './components/StatCards'
import { Toast } from './components/Toast'
import type { ToastMessage } from './components/Toast'
import {
  useAssetGeoJson,
  useAssetList,
  useCreateAsset,
  useDeleteAsset,
  useNeighborhoods,
  useSummary,
  useUpdateAsset,
} from './hooks/assets'
import { useDebounce } from './hooks/useDebounce'
import type { AssetFilters, AssetInput, AssetSort } from './types'

const PAGE_SIZE = 10

const emptyFilters: AssetFilters = { search: '', categories: [], statuses: [], neighborhood: '' }

// null = form kapalı, 'new' = yeni kayıt, sayı = o varlığı düzenle
type FormState = null | 'new' | number

function App() {
  const [filters, setFilters] = useState<AssetFilters>(emptyFilters)
  const [sort, setSort] = useState<AssetSort>({ sort: 'name', desc: false })
  const [page, setPage] = useState(1)

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(null)
  const [deleting, setDeleting] = useState<{ id: number; name: string } | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)

  // Her tuşta değil, yazma durulunca sorgula.
  const debouncedSearch = useDebounce(filters.search, 300)
  const queryFilters = useMemo(() => ({ ...filters, search: debouncedSearch }), [filters, debouncedSearch])

  const list = useAssetList(queryFilters, sort, page, PAGE_SIZE)
  const geojson = useAssetGeoJson(queryFilters)
  const summary = useSummary()
  const neighborhoods = useNeighborhoods()

  const createAsset = useCreateAsset()
  const updateAsset = useUpdateAsset()
  const deleteAsset = useDeleteAsset()

  const dismissToast = useCallback(() => setToast(null), [])

  function changeFilters(update: (current: AssetFilters) => AssetFilters) {
    setFilters(update)
    setPage(1)
  }

  function changeSort(key: AssetSort['sort']) {
    setSort((current) => ({ sort: key, desc: current.sort === key ? !current.desc : false }))
    setPage(1)
  }

  async function handleSubmit(input: AssetInput) {
    if (typeof form === 'number') {
      await updateAsset.mutateAsync({ id: form, input })
      setToast({ type: 'success', text: 'Varlık güncellendi.' })
    } else {
      const created = await createAsset.mutateAsync(input)
      setSelectedId(created.id)
      setToast({ type: 'success', text: 'Varlık eklendi.' })
    }
    setForm(null)
  }

  async function handleDelete() {
    if (!deleting) return

    try {
      await deleteAsset.mutateAsync(deleting.id)
      if (selectedId === deleting.id) setSelectedId(null)
      if (detailId === deleting.id) setDetailId(null)
      setToast({ type: 'success', text: `"${deleting.name}" silindi.` })
    } catch (err) {
      setToast({ type: 'error', text: (err as Error).message })
    } finally {
      setDeleting(null)
    }
  }

  const loadError = list.error ?? geojson.error ?? summary.error

  return (
    <>
      <Header onNew={() => setForm('new')} disabled={form !== null} />

      <main className="container">
        <StatCards summary={summary.data} loading={summary.isLoading} />

        {loadError && (
          <div className="card banner-error" role="alert">
            <div>
              <strong>Veriler alınamadı.</strong> {loadError.message}
            </div>
            <button
              className="btn"
              onClick={() => {
                void list.refetch()
                void geojson.refetch()
                void summary.refetch()
              }}
            >
              Tekrar dene
            </button>
          </div>
        )}

        <FilterBar
          filters={filters}
          onChange={changeFilters}
          total={list.data?.total}
          neighborhoods={neighborhoods.data ?? []}
        />

        <section className="card map-card" aria-label="Harita">
          <AssetMap
            collection={geojson.data}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onOpenDetail={setDetailId}
          />
        </section>

        <section className="card table-card" aria-label="Varlık listesi">
          <AssetTable
            assets={list.data?.items ?? []}
            loading={list.isLoading}
            fetching={list.isFetching}
            sort={sort}
            onSort={changeSort}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onOpen={setDetailId}
            onEdit={setForm}
            onDelete={(asset) => setDeleting({ id: asset.id, name: asset.name })}
            canEdit
            canDelete
          />
          {list.data && (
            <Pagination
              page={list.data.page}
              totalPages={list.data.totalPages}
              total={list.data.total}
              pageSize={list.data.pageSize}
              onPage={setPage}
            />
          )}
        </section>

        <footer className="footer">
          SmartCity GIS · ASP.NET Core · PostgreSQL/PostGIS · React · Leaflet · Harita verisi © OpenStreetMap
          katkıda bulunanlar
        </footer>
      </main>

      {detailId !== null && (
        <AssetDetail
          id={detailId}
          onClose={() => setDetailId(null)}
          onShowOnMap={(id) => {
            setSelectedId(id)
            setDetailId(null)
          }}
          onEdit={(id) => {
            setDetailId(null)
            setForm(id)
          }}
          onDelete={(id, name) => {
            setDetailId(null)
            setDeleting({ id, name })
          }}
          canEdit
          canDelete
        />
      )}

      {form !== null && (
        <AssetFormModal editId={form === 'new' ? null : form} onSubmit={handleSubmit} onClose={() => setForm(null)} />
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
