import { useRef, useState } from 'react'
import { exportUrl } from '../api/data'
import { useToast } from '../context/ToastContext'
import {
  useGeoJsonUpload,
  useOsmAssetImport,
  useOsmNeighborhoodImport,
  useReassignNeighborhoods,
} from '../hooks/data'
import { categories, categoryColors, categoryLabels } from '../labels'
import type { AssetCategory, GeoJsonImportReport, ImportResult, OsmKind } from '../types'

const DISTRICTS = [
  'Çankaya', 'Altındağ', 'Yenimahalle', 'Keçiören', 'Mamak', 'Etimesgut', 'Sincan', 'Pursaklar', 'Gölbaşı',
  'Akyurt', 'Elmadağ', 'Kahramankazan', 'Polatlı', 'Beypazarı', 'Çubuk', 'Kızılcahamam', 'Haymana', 'Nallıhan',
]

const OSM_KINDS: { kind: OsmKind; label: string; hint: string }[] = [
  { kind: 'Parks', label: 'Parklar', hint: 'leisure=park (alan)' },
  { kind: 'Roads', label: 'Ana yollar', hint: 'otoyol, ana ve ikincil yollar (çizgi)' },
  { kind: 'PublicBuildings', label: 'Kamu binaları', hint: 'belediye, hastane, polis, itfaiye, kütüphane...' },
  { kind: 'Infrastructure', label: 'Altyapı', hint: 'su deposu, trafo merkezi, arıtma' },
  { kind: 'StreetLights', label: 'Sokak lambaları', hint: 'highway=street_lamp (nokta; OSM\'de az bulunur)' },
]

function ResultSummary({ result }: { result: ImportResult }) {
  return (
    <div className="result-box">
      <ul className="result-stats">
        <li><strong>{result.created}</strong> eklendi</li>
        {result.updated > 0 && <li><strong>{result.updated}</strong> güncellendi</li>}
        <li><strong>{result.skipped}</strong> zaten vardı</li>
        <li><strong>{result.invalid}</strong> geçersiz</li>
      </ul>
      {Object.keys(result.byKind).length > 0 && (
        <p className="field-hint">
          {Object.entries(result.byKind).map(([kind, count]) => `${kind}: ${count}`).join(' · ')}
        </p>
      )}
      {result.messages.map((message) => (
        <p key={message} className="field-hint">{message}</p>
      ))}
    </div>
  )
}

function ExportCard() {
  const [selected, setSelected] = useState<AssetCategory[]>([])
  const filters = { categories: selected }

  return (
    <section className="card data-card">
      <header>
        <h2>Dışa aktar</h2>
        <p>Envanteri QGIS, ArcGIS, Excel veya başka bir kurumun sistemiyle paylaşın.</p>
      </header>

      <div className="filters-row chips">
        <span className="chips-label">Kategori</span>
        {categories.map((category) => (
          <button
            key={category}
            className={`filter-chip ${selected.includes(category) ? 'on' : ''}`}
            aria-pressed={selected.includes(category)}
            onClick={() =>
              setSelected((list) => (list.includes(category) ? list.filter((c) => c !== category) : [...list, category]))
            }
          >
            <span className="dot" style={{ background: categoryColors[category] }} />
            {categoryLabels[category]}
          </button>
        ))}
      </div>
      <p className="field-hint">Hiçbiri seçili değilse tüm varlıklar indirilir.</p>

      <div className="data-actions">
        <a className="btn primary" href={exportUrl('geojson', filters)} download>
          GeoJSON indir
        </a>
        <a className="btn" href={exportUrl('csv', filters)} download>
          CSV indir (Excel)
        </a>
      </div>
      <p className="field-hint">
        GeoJSON, geometrileri (nokta, çizgi, alan) korur ve doğrudan QGIS'e sürüklenebilir. CSV, Türkçe Excel için
        ';' ayraçlı ve UTF-8'dir; geometri WKT sütunundadır.
      </p>
    </section>
  )
}

function GeoJsonImportCard() {
  const toast = useToast()
  const upload = useGeoJsonUpload()
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<GeoJsonImportReport | null>(null)
  const [done, setDone] = useState<GeoJsonImportReport | null>(null)

  function pick(next: File | null) {
    setFile(next)
    setPreview(null)
    setDone(null)
  }

  async function run(dryRun: boolean) {
    if (!file) return
    try {
      const report = await upload.mutateAsync({ file, dryRun })
      if (dryRun) setPreview(report)
      else {
        setDone(report)
        setPreview(null)
        toast.success(`${report.created} varlık içe aktarıldı.`)
      }
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const report = done ?? preview

  return (
    <section className="card data-card">
      <header>
        <h2>GeoJSON içe aktar</h2>
        <p>Başka bir kurumdan veya QGIS'ten gelen veriyi önce doğrulayın, sonra ekleyin.</p>
      </header>

      <div
        className="dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          pick(e.dataTransfer.files[0] ?? null)
        }}
      >
        <input
          ref={input}
          type="file"
          accept=".geojson,.json,application/geo+json,application/json"
          hidden
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <p>
            <strong>{file.name}</strong> · {(file.size / 1024).toFixed(1)} KB
          </p>
        ) : (
          <p>Dosyayı buraya sürükleyin veya seçin</p>
        )}
        <button className="btn" onClick={() => input.current?.click()}>
          Dosya seç
        </button>
      </div>

      <p className="field-hint">
        Her özellikte <code>name</code> (ad) ve <code>category</code> (Park, Road, Building, StreetLight,
        Infrastructure) gerekir. <code>status</code>, <code>neighborhood</code>, <code>description</code> isteğe bağlıdır;
        mahalle boşsa konumdan otomatik bulunur. Geometri WGS84 (EPSG:4326) olmalıdır.
      </p>

      <div className="data-actions">
        <button className="btn" onClick={() => run(true)} disabled={!file || upload.isPending}>
          {upload.isPending && upload.variables?.dryRun ? 'Doğrulanıyor…' : 'Doğrula (önizleme)'}
        </button>
        <button
          className="btn primary"
          onClick={() => run(false)}
          disabled={!preview || preview.valid === 0 || upload.isPending}
        >
          {upload.isPending && !upload.variables?.dryRun ? 'Aktarılıyor…' : `İçe aktar${preview ? ` (${preview.valid})` : ''}`}
        </button>
      </div>

      {report && (
        <div className="result-box">
          <ul className="result-stats">
            <li><strong>{report.total}</strong> özellik</li>
            <li className="ok"><strong>{report.valid}</strong> geçerli</li>
            <li className={report.invalid ? 'bad' : ''}><strong>{report.invalid}</strong> geçersiz</li>
            {report.created > 0 && <li><strong>{report.created}</strong> eklendi</li>}
          </ul>
          {report.dryRun && report.valid > 0 && <p className="field-hint">Önizleme: henüz hiçbir şey kaydedilmedi.</p>}
          {report.problems.length > 0 && (
            <ul className="problem-list">
              {report.problems.map((problem) => (
                <li key={problem.index}>
                  <strong>#{problem.index}</strong> {problem.name ? `“${problem.name}”` : ''} — {problem.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

function OsmCard() {
  const toast = useToast()
  const boundaries = useOsmNeighborhoodImport()
  const assets = useOsmAssetImport()
  const reassign = useReassignNeighborhoods()

  const [district, setDistrict] = useState('Çankaya')
  const [kinds, setKinds] = useState<OsmKind[]>(['Parks', 'PublicBuildings'])
  const [maxPerKind, setMaxPerKind] = useState(100)
  const [result, setResult] = useState<ImportResult | null>(null)

  const busy = boundaries.isPending || assets.isPending || reassign.isPending

  async function importBoundaries() {
    try {
      const r = await boundaries.mutateAsync(district)
      setResult(r)
      toast.success(`${district}: ${r.created} yeni, ${r.updated} güncellenen mahalle sınırı.`)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function importAssets() {
    try {
      const r = await assets.mutateAsync({ district, kinds, maxPerKind })
      setResult(r)
      toast.success(`${r.created} varlık içe aktarıldı.`)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function reassignAll() {
    try {
      const r = await reassign.mutateAsync()
      toast.success(`${r.updated} varlığın mahallesi yeniden belirlendi.`)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <section className="card data-card wide">
      <header>
        <h2>OpenStreetMap'ten içe aktar</h2>
        <p>
          Gerçek park, yol ve kamu binası verisini Overpass API üzerinden çekin. Veri © OpenStreetMap katkıda
          bulunanlar, ODbL lisansı. Aynı kayıt ikinci kez eklenmez.
        </p>
      </header>

      <label className="inline-field">
        İlçe
        <select value={district} onChange={(e) => setDistrict(e.target.value)} disabled={busy}>
          {DISTRICTS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <div className="data-step">
        <h3>1. Mahalle sınırları</h3>
        <p className="field-hint">
          Varlıkların mahallesini konumdan bulmak ve harita üzerinde yoğunluk göstermek için kullanılır. PostGIS
          ST_CoverageSimplify ile komşu sınırlar birlikte sadeleştirilir.
        </p>
        <button className="btn" onClick={importBoundaries} disabled={busy}>
          {boundaries.isPending ? 'İçe aktarılıyor… (30-60 sn)' : `${district} mahalle sınırlarını al`}
        </button>
      </div>

      <div className="data-step">
        <h3>2. Varlıklar</h3>
        <div className="kind-grid">
          {OSM_KINDS.map(({ kind, label, hint }) => (
            <label key={kind} className="kind-option">
              <input
                type="checkbox"
                checked={kinds.includes(kind)}
                onChange={() =>
                  setKinds((list) => (list.includes(kind) ? list.filter((k) => k !== kind) : [...list, kind]))
                }
                disabled={busy}
              />
              <span>
                <strong>{label}</strong>
                <small>{hint}</small>
              </span>
            </label>
          ))}
        </div>
        <label className="inline-field">
          Tür başına en fazla
          <input
            type="number"
            min={1}
            max={1000}
            value={maxPerKind}
            onChange={(e) => setMaxPerKind(Number(e.target.value))}
            disabled={busy}
          />
        </label>
        <button className="btn primary" onClick={importAssets} disabled={busy || kinds.length === 0}>
          {assets.isPending ? 'İçe aktarılıyor… (her tür ~30 sn)' : 'Varlıkları içe aktar'}
        </button>
      </div>

      <div className="data-step">
        <h3>3. Bakım</h3>
        <p className="field-hint">
          Mahalle sınırları sonradan eklendiyse, "Belirsiz" mahalleli varlıklar konumlarına göre yeniden eşleştirilir.
        </p>
        <button className="btn" onClick={reassignAll} disabled={busy}>
          {reassign.isPending ? 'Eşleştiriliyor…' : 'Mahalleleri yeniden eşleştir'}
        </button>
      </div>

      {result && <ResultSummary result={result} />}
    </section>
  )
}

export function DataPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Veri Aktarımı</h1>
          <p>Kurumlar arası veri paylaşımı: standart CBS formatlarında içe ve dışa aktarma.</p>
        </div>
      </div>

      <div className="data-grid">
        <ExportCard />
        <GeoJsonImportCard />
        <OsmCard />
      </div>
    </>
  )
}
