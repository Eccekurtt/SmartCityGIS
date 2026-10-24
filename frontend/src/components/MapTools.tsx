import { useEffect } from 'react'
import { Circle, CircleMarker, Polygon, Polyline, useMap, useMapEvents } from 'react-leaflet'
import { useNearby } from '../hooks/assets'
import type { MapTools } from '../hooks/useMapTools'
import { useDebounce } from '../hooks/useDebounce'
import { categoryColors, categoryLabels } from '../labels'
import { formatArea, formatDistance, formatLength } from '../lib/format'
import { lineLengthMeters, polygonAreaSquareMeters } from '../lib/geo'
import { RulerIcon, TargetIcon, UndoIcon, XIcon } from './icons'

// ---------------------------------------------------------------- Harita İÇİNDE çizilenler

export function MapToolLayers({ tools }: { tools: MapTools }) {
  const map = useMap()
  const { tool, setOrigin, setPoints } = tools

  useMapEvents({
    click(e) {
      if (tool === 'nearby') setOrigin({ lat: e.latlng.lat, lon: e.latlng.lng })
      if (tool === 'measure') setPoints((p) => [...p, [e.latlng.lat, e.latlng.lng]])
    },
  })

  // Araç açıkken imleç artı işareti olur, çift tıkla yakınlaştırma kapanır.
  useEffect(() => {
    map.getContainer().style.cursor = tool ? 'crosshair' : ''
    if (tool) map.doubleClickZoom.disable()
    else map.doubleClickZoom.enable()
  }, [tool, map])

  return (
    <>
      {tool === 'nearby' && tools.origin && (
        <>
          <Circle
            center={[tools.origin.lat, tools.origin.lon]}
            radius={tools.radius}
            pathOptions={{ color: '#2563eb', weight: 2, dashArray: '6 6', fillColor: '#2563eb', fillOpacity: 0.08 }}
            interactive={false}
          />
          <CircleMarker
            center={[tools.origin.lat, tools.origin.lon]}
            radius={6}
            pathOptions={{ color: '#fff', weight: 2, fillColor: '#2563eb', fillOpacity: 1 }}
            interactive={false}
          />
        </>
      )}

      {tool === 'measure' && tools.points.length > 0 && (
        <>
          {tools.mode === 'line' && tools.points.length > 1 && (
            <Polyline positions={tools.points} pathOptions={{ color: '#dc2626', weight: 3 }} interactive={false} />
          )}
          {tools.mode === 'area' && tools.points.length > 2 && (
            <Polygon
              positions={tools.points}
              pathOptions={{ color: '#dc2626', weight: 3, fillOpacity: 0.12 }}
              interactive={false}
            />
          )}
          {tools.mode === 'area' && tools.points.length === 2 && (
            <Polyline positions={tools.points} pathOptions={{ color: '#dc2626', weight: 3 }} interactive={false} />
          )}
          {tools.points.map((point, index) => (
            <CircleMarker
              key={index}
              center={point}
              radius={4}
              pathOptions={{ color: '#dc2626', weight: 2, fillColor: '#fff', fillOpacity: 1 }}
              interactive={false}
            />
          ))}
        </>
      )}
    </>
  )
}

// ---------------------------------------------------------------- Haritanın ÜSTÜNDEKİ düğmeler ve paneller

export function MapToolButtons({ tools }: { tools: MapTools }) {
  return (
    <div className="map-tools" role="toolbar" aria-label="Harita araçları">
      <button
        className={`map-tool-btn ${tools.tool === 'nearby' ? 'on' : ''}`}
        onClick={() => tools.choose('nearby')}
        aria-pressed={tools.tool === 'nearby'}
        title="Haritada bir noktaya tıklayıp çevresindeki varlıkları bul"
      >
        <TargetIcon size={16} /> Yakın çevre
      </button>
      <button
        className={`map-tool-btn ${tools.tool === 'measure' ? 'on' : ''}`}
        onClick={() => tools.choose('measure')}
        aria-pressed={tools.tool === 'measure'}
        title="Mesafe veya alan ölç"
      >
        <RulerIcon size={16} /> Ölçüm
      </button>
    </div>
  )
}

export function MapToolPanel({ tools, onSelect }: { tools: MapTools; onSelect: (id: number) => void }) {
  if (tools.tool === 'nearby') return <NearbyPanel tools={tools} onSelect={onSelect} />
  if (tools.tool === 'measure') return <MeasurePanel tools={tools} />
  return null
}

function NearbyPanel({ tools, onSelect }: { tools: MapTools; onSelect: (id: number) => void }) {
  const radius = useDebounce(tools.radius, 250)
  const { data, isFetching } = useNearby(tools.origin, radius)

  return (
    <aside className="tool-panel" aria-label="Yakın çevre">
      <header>
        <strong>Yakın çevre analizi</strong>
        <button className="icon-btn" onClick={tools.close} aria-label="Aracı kapat">
          <XIcon size={16} />
        </button>
      </header>

      {!tools.origin ? (
        <p className="tool-hint">Haritada bir noktaya tıklayın. PostGIS (ST_DWithin) bu noktanın çevresindeki varlıkları metre cinsinden bulur.</p>
      ) : (
        <>
          <label className="tool-slider">
            Yarıçap: <strong>{formatDistance(tools.radius)}</strong>
            <input
              type="range"
              min={100}
              max={5000}
              step={100}
              value={tools.radius}
              onChange={(e) => tools.setRadius(Number(e.target.value))}
            />
          </label>

          <div className="tool-count">
            {data ? <><strong>{data.length}</strong> varlık bulundu</> : 'Aranıyor…'}
            {isFetching && data && <span className="tool-spin"> · güncelleniyor</span>}
          </div>

          <ul className="tool-results">
            {data?.map((asset) => (
              <li key={asset.id}>
                <button onClick={() => onSelect(asset.id)}>
                  <span className="dot" style={{ background: categoryColors[asset.category] }} />
                  <span className="tool-name">
                    {asset.name}
                    <small>{categoryLabels[asset.category]} · {asset.neighborhood}</small>
                  </span>
                  <span className="tool-dist">{asset.distanceMeters === 0 ? 'içinde' : formatDistance(asset.distanceMeters)}</span>
                </button>
              </li>
            ))}
            {data?.length === 0 && <li className="tool-hint">Bu yarıçapta varlık yok.</li>}
          </ul>
        </>
      )}
    </aside>
  )
}

function MeasurePanel({ tools }: { tools: MapTools }) {
  const positions = tools.points.map(([lat, lon]): [number, number] => [lon, lat]) // GeoJSON sırası
  const value =
    tools.mode === 'line'
      ? tools.points.length >= 2
        ? formatLength(lineLengthMeters(positions))
        : '—'
      : tools.points.length >= 3
        ? formatArea(polygonAreaSquareMeters(positions))
        : '—'

  return (
    <aside className="tool-panel" aria-label="Ölçüm">
      <header>
        <strong>Ölçüm aracı</strong>
        <button className="icon-btn" onClick={tools.close} aria-label="Aracı kapat">
          <XIcon size={16} />
        </button>
      </header>

      <div className="tool-modes">
        <button className={tools.mode === 'line' ? 'on' : ''} onClick={() => { tools.setMode('line'); tools.setPoints([]) }}>
          Mesafe
        </button>
        <button className={tools.mode === 'area' ? 'on' : ''} onClick={() => { tools.setMode('area'); tools.setPoints([]) }}>
          Alan
        </button>
      </div>

      <div className="tool-value">{value}</div>
      <p className="tool-hint">
        {tools.mode === 'line' ? 'Noktaları sırayla tıklayın; toplam yol uzunluğu hesaplanır.' : 'En az 3 köşe tıklayın; çokgenin alanı hesaplanır.'}
        {' '}({tools.points.length} nokta · jeodezik hesap)
      </p>

      <div className="tool-actions">
        <button className="btn small" onClick={() => tools.setPoints((p) => p.slice(0, -1))} disabled={tools.points.length === 0}>
          <UndoIcon size={14} /> Geri al
        </button>
        <button className="btn small" onClick={() => tools.setPoints([])} disabled={tools.points.length === 0}>
          Temizle
        </button>
      </div>
    </aside>
  )
}
