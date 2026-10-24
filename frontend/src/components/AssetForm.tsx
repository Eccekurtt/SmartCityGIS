import { useState } from 'react'
import type { FormEvent } from 'react'
import { categoryLabels, statusLabels } from '../labels'
import type { Asset, AssetCategory, AssetInput, AssetStatus } from '../types'

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
  // Sayı alanları metin olarak tutulur; gönderirken Number()'a çevrilir.
  const [latitude, setLatitude] = useState(asset ? String(asset.latitude) : '')
  const [longitude, setLongitude] = useState(asset ? String(asset.longitude) : '')
  const [description, setDescription] = useState(asset?.description ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaving(true)

    try {
      await onSubmit({
        name: name.trim(),
        category,
        status,
        neighborhood: neighborhood.trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
        description: description.trim() === '' ? null : description.trim(),
      })
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h2>{asset ? 'Varlığı Düzenle' : 'Yeni Varlık'}</h2>

      <label>
        Ad
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
      </label>

      <div className="row">
        <label>
          Kategori
          <select value={category} onChange={(e) => setCategory(e.target.value as AssetCategory)}>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Durum
          <select value={status} onChange={(e) => setStatus(e.target.value as AssetStatus)}>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Mahalle
        <input
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          maxLength={100}
          required
        />
      </label>

      <div className="row">
        <label>
          Enlem (-90 / 90)
          <input
            type="number"
            step="any"
            min={-90}
            max={90}
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            required
          />
        </label>

        <label>
          Boylam (-180 / 180)
          <input
            type="number"
            step="any"
            min={-180}
            max={180}
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            required
          />
        </label>
      </div>

      <label>
        Açıklama (isteğe bağlı)
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={2}
        />
      </label>

      {error && <p className="error">{error}</p>}

      <div className="actions">
        <button type="submit" className="primary" disabled={saving}>
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}>
          Vazgeç
        </button>
      </div>
    </form>
  )
}
