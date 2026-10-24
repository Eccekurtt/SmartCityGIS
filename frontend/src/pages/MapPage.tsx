import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AssetDetail } from '../components/AssetDetail'
import { AssetFormModal } from '../components/AssetFormModal'
import { AssetMap } from '../components/AssetMap'
import { AssetTable } from '../components/AssetTable'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { FilterBar } from '../components/FilterBar'
import { PlusIcon } from '../components/icons'
import { Pagination } from '../components/Pagination'
import { StatCards } from '../components/StatCards'
import { useToast } from '../context/ToastContext'
import {
  useAssetGeoJson,
  useAssetList,
  useCreateAsset,
  useDeleteAsset,
  useNeighborhoods,
  useSummary,
  useUpdateAsset,
} from '../hooks/assets'
import { usePermissions } from '../hooks/usePermissions'
import { useDebounce } from '../hooks/useDebounce'
import type { AssetFilters, AssetInput, AssetSort } from '../types'

const PAGE_SIZE = 10

const emptyFilters: AssetFilters = { search: '', categories: [], statuses: [], neighborhood: '' }

// null = form kapalı, 'new' = yeni kayıt, sayı = o varlığı düzenle
type FormState = null | 'new' | number

export function MapPage() {
  const toast = useToast()
  const { canWrite, canDelete } = usePermissions()
  const [searchParams, setSearchParams] = useSearchParams()

  const [filters, setFilters] = useState<AssetFilters>(emptyFilters)
  const [sort, setSort] = useState<AssetSort>({ sort: 'name', desc: false })
  const [page, setPage] = useState(1)

  // Başka sayfadan "Haritada göster" ile gelindiyse (?select=12) o varlığı seç.
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const value = Number(searchParams.get('select'))
    return Number.isInteger(value) && value > 0 ? value : null
  })
  const [detailId, setDetailId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(null)
  const [deleting, setDeleting] = useState<{ id: number; name: string } | null>(null)

  useEffect(() => {
    if (searchParams.has('select')) setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

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
      toast.success('Varlık güncellendi.')
    } else {
      const created = await createAsset.mutateAsync(input)
      setSelectedId(created.id)
      toast.success('Varlık eklendi.')
    }
    setForm(null)
  }

  async function handleDelete() {
    if (!deleting) return

    try {
      await deleteAsset.mutateAsync(deleting.id)
      if (selectedId === deleting.id) setSelectedId(null)
      if (detailId === deleting.id) setDetailId(null)
      toast.success(`"${deleting.name}" silindi.`)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setDeleting(null)
    }
  }

  const loadError = list.error ?? geojson.error ?? summary.error

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Envanter ve Harita</h1>
          <p>Belediye varlıklarını harita üzerinde görüntüleyin, filtreleyin ve yönetin.</p>
        </div>
        {canWrite && (
          <button className="btn primary" onClick={() => setForm('new')} disabled={form !== null}>
            <PlusIcon size={16} />
            Yeni Varlık
          </button>
        )}
      </div>

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
          onPickNeighborhood={(name) => changeFilters((f) => ({ ...f, neighborhood: name }))}
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
          canEdit={canWrite}
          canDelete={canDelete}
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
          canEdit={canWrite}
          canDelete={canDelete}
        />
      )}

      {form !== null && (
        <AssetFormModal editId={form === 'new' ? null : form} onSubmit={handleSubmit} onClose={() => setForm(null)} />
      )}

      {deleting && (
        <ConfirmDialog
          title="Varlığı sil"
          message={`"${deleting.name}" ve tüm bakım kayıtları kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
          confirmLabel="Sil"
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  )
}
