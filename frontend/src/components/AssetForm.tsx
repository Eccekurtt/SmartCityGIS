import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Geometry } from 'geojson'
import { ApiError } from '../api/client'
import { categories, categoryLabels, statuses, statusLabels } from '../labels'
import type { Asset, AssetCategory, AssetInput, AssetStatus } from '../types'
import { GeometryEditor } from './GeometryEditor'

interface Props {
  asset: Asset | null // null = yeni kayıt, dolu = düzenleme
  onSubmit: (input: AssetInput) => Promise<void>
  onCancel: () => void
}

export function AssetForm({ asset, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(asset?.name ?? '')
  const [category, setCategory] = useState<AssetCategory>(asset?.category ?? 'Park')
  const [status, setStatus] = useState<AssetStatus>(asset?.status ?? 'Active')
  const [neighborhood, setNeighborhood] = useState(asset?.neighborhood ?? '')
  const [description, setDescription] = useState(asset?.description ?? '')
  const [geometry, setGeometry] = useState<Geometry | null>(asset?.geometry ?? null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!geometry) {
      setError('Lütfen haritada bir konum çizin: nokta, çizgi veya alan seçin.')
      return
    }

    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        category,
        status,
        neighborhood: neighborhood.trim(),
        description: description.trim() === '' ? null : description.trim(),
        geometry,
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kaydedilirken bir hata oluştu.')
      setSaving(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label>
        Ad
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required autoFocus />
      </label>

      <div className="row">
        <label>
          Kategori
          <select value={category} onChange={(e) => setCategory(e.target.value as AssetCategory)}>
            {categories.map((value) => (
              <option key={value} value={value}>
                {categoryLabels[value]}
              </option>
            ))}
          </select>
        </label>

        <label>
          Durum
          <select value={status} onChange={(e) => setStatus(e.target.value as AssetStatus)}>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {statusLabels[value]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Mahalle
        <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} maxLength={100} required />
      </label>

      <div className="field">
        <span className="field-label">Konum (haritada çizin)</span>
        <GeometryEditor value={geometry} onChange={setGeometry} />
      </div>

      <label>
        Açıklama (isteğe bağlı)
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={2} />
      </label>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>
          Vazgeç
        </button>
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </form>
  )
}
