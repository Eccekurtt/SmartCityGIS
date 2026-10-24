import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import L from 'leaflet'
import type { Path, PathOptions } from 'leaflet'
import {
  CircleMarker,
  LayerGroup,
  LayersControl,
  MapContainer,
  Pane,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useNeighborhoodGeoJson } from '../hooks/neighborhoods'
import { categories, categoryColors, categoryLabels, geometryLabels, statusLabels } from '../labels'
import { classBreaks, legendItems } from '../lib/choropleth'
import { flip, flipLine, flipPolygon } from '../lib/geo'
import { formatArea, formatLength } from '../lib/format'
import type { AssetFeatureCollection, AssetFeatureProps } from '../types'
import { ExpandIcon } from './icons'
import { useMapTools } from '../hooks/useMapTools'
import { MapToolButtons, MapToolLayers, MapToolPanel } from './MapTools'
import { NeighborhoodLayer } from './NeighborhoodLayer'

const HOOD_LAYER_NAME = 'Mahalle yoğunluğu'

// Katman kontrolünden "Mahalle yoğunluğu" açılıp kapanınca haber verir (veri yalnızca açıkken çekilir).
function OverlayWatcher({ onChange }: { onChange: (on: boolean) => void }) {
  useMapEvents({
    overlayadd: (e) => e.name === HOOD_LAYER_NAME && onChange(true),
    overlayremove: (e) => e.name === HOOD_LAYER_NAME && onChange(false),
  })
  return null
}

interface Props {
  collection: AssetFeatureCollection | undefined
  selectedId: number | null
  onSelect: (id: number) => void
  onOpenDetail: (id: number) => void
  // Mahalle poligonuna tıklanınca (filtre uygulamak için)
  onPickNeighborhood?: (name: string) => void
  // Harita içinde çalışan araçlar (yakınımdakiler, ölçüm...) buraya eklenir.
  children?: ReactNode
}

type Registry = Map<number, Path>

// Kategoriye ve duruma göre çizim stili: renk = kategori, kırmızı kesikli = bakımda, soluk = pasif.
function styleFor(p: AssetFeatureProps, kind: 'point' | 'line' | 'area', selected: boolean): PathOptions {
  const color = categoryColors[p.category]
  const maintenance = p.status === 'UnderMaintenance'
  const inactive = p.status === 'Inactive'

  if (kind === 'line') {
    return {
      color: maintenance ? '#dc2626' : color,
      weight: selected ? 8 : 5,
      opacity: inactive ? 0.45 : 0.95,
      dashArray: maintenance ? '8 8' : undefined,
      lineCap: 'round',
    }
  }

  return {
    color: maintenance ? '#dc2626' : selected ? '#0f172a' : '#1f2937',
    fillColor: color,
    fillOpacity: inactive ? 0.18 : kind === 'area' ? 0.4 : 0.9,
    weight: selected ? 4 : 2,
    opacity: inactive ? 0.6 : 1,
    dashArray: maintenance ? '5 5' : undefined,
  }
}

interface ShapeProps {
  feature: AssetFeatureCollection['features'][number]
  selected: boolean
  // Ölçüm / yakın çevre aracı açıkken varlıklar tıklamaya ve popup'a cevap vermez; tıklama araca gider.
  toolActive: boolean
  onSelect: (id: number) => void
  onOpenDetail: (id: number) => void
  registry: RefObject<Registry>
}

function AssetShape({ feature, selected, toolActive, onSelect, onOpenDetail, registry }: ShapeProps) {
  const p = feature.properties
  const geometry = feature.geometry
  const handlers = { click: () => !toolActive && onSelect(p.id) }

  const register = (layer: Path | null) => {
    if (layer) registry.current.set(p.id, layer)
    else registry.current.delete(p.id)
  }

  const popup = toolActive ? null : (
    <Popup>
      <div className="popup">
        <strong>{p.name}</strong>
        <div className="popup-meta">
          {categoryLabels[p.category]} · {statusLabels[p.status]}
        </div>
        <div>{p.neighborhood}</div>
        <div className="popup-meta">
          {geometryLabels[p.geometryType] ?? p.geometryType}
          {p.lengthMeters != null && ` · ${formatLength(p.lengthMeters)}`}
          {p.areaSquareMeters != null && ` · ${formatArea(p.areaSquareMeters)}`}
        </div>
        <button className="popup-link" onClick={() => onOpenDetail(p.id)}>
          Ayrıntıları aç
        </button>
      </div>
    </Popup>
  )

  switch (geometry.type) {
    case 'Point':
      return (
        <CircleMarker
          ref={register}
          center={flip(geometry.coordinates)}
          radius={selected ? 12 : 8}
          pathOptions={styleFor(p, 'point', selected)}
          eventHandlers={handlers}
        >
          {popup}
        </CircleMarker>
      )
    case 'LineString':
      return (
        <Polyline
          ref={register}
          positions={flipLine(geometry.coordinates)}
          pathOptions={styleFor(p, 'line', selected)}
          eventHandlers={handlers}
        >
          {popup}
        </Polyline>
      )
    case 'MultiLineString':
      return (
        <Polyline
          ref={register}
          positions={geometry.coordinates.map(flipLine)}
          pathOptions={styleFor(p, 'line', selected)}
          eventHandlers={handlers}
        >
          {popup}
        </Polyline>
      )
    case 'Polygon':
      return (
        <Polygon
          ref={register}
          positions={flipPolygon(geometry.coordinates)}
          pathOptions={styleFor(p, 'area', selected)}
          eventHandlers={handlers}
        >
          {popup}
        </Polygon>
      )
    case 'MultiPolygon':
      return (
        <Polygon
          ref={register}
          positions={geometry.coordinates.map(flipPolygon)}
          pathOptions={styleFor(p, 'area', selected)}
          eventHandlers={handlers}
        >
          {popup}
        </Polygon>
      )
    default:
      return null
  }
}

// Seçim değişince haritayı o varlığa götürür ve popup'ını açar.
function SelectionController({
  collection,
  selectedId,
  registry,
}: {
  collection: AssetFeatureCollection | undefined
  selectedId: number | null
  registry: RefObject<Registry>
}) {
  const map = useMap()
  // En son odaklanılan varlık: veri yenilenince (filtre, düzenleme) harita yeniden kaymasın,
  // ama seçim veriden önce gelmişse (sayfa açılışında ?select=12) veri gelince uygulansın.
  const focused = useRef<number | null>(null)

  useEffect(() => {
    if (selectedId === null) {
      focused.current = null
      return
    }
    if (!collection || focused.current === selectedId) return

    const feature = collection.features.find((f) => f.properties.id === selectedId)
    if (!feature) return
    focused.current = selectedId

    const bounds = L.geoJSON(feature.geometry).getBounds()
    if (feature.geometry.type === 'Point') {
      map.flyTo(bounds.getCenter(), Math.max(map.getZoom(), 16), { duration: 0.6 })
    } else {
      map.flyToBounds(bounds, { maxZoom: 17, padding: [60, 60], duration: 0.6 })
    }

    // Popup'ı kaydırma animasyonu bitince aç: sayfa açılışında katman nesneleri henüz haritaya
    // eklenmemiş olabilir, bu yüzden kısa bir gecikmeyle (ve moveend ile) denenir.
    const openPopup = () => {
      const layer = registry.current.get(selectedId)
      if (layer && map.hasLayer(layer)) {
        layer.bringToFront()
        if (!layer.isPopupOpen()) layer.openPopup()
      }
    }
    map.once('moveend', openPopup)
    const timer = setTimeout(openPopup, 900)
    return () => {
      clearTimeout(timer)
      map.off('moveend', openPopup)
    }
  }, [selectedId, collection, map, registry])

  return null
}

// İlk veri geldiğinde ve "Tümünü göster" ile haritayı tüm özelliklere sığdırır.
function FitController({
  collection,
  fitSignal,
}: {
  collection: AssetFeatureCollection | undefined
  fitSignal: number
}) {
  const map = useMap()
  const fitted = useRef(-1)

  useEffect(() => {
    if (!collection || collection.features.length === 0 || fitted.current === fitSignal) return
    fitted.current = fitSignal
    const bounds = L.geoJSON(collection).getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
  }, [collection, fitSignal, map])

  return null
}

export function AssetMap({
  collection,
  selectedId,
  onSelect,
  onOpenDetail,
  onPickNeighborhood,
  children,
}: Props) {
  const registry = useRef<Registry>(new Map())
  const [fitSignal, setFitSignal] = useState(0)
  const requestFit = useCallback(() => setFitSignal((n) => n + 1), [])

  const tools = useMapTools()

  const [hoodsOn, setHoodsOn] = useState(false)
  const hoods = useNeighborhoodGeoJson(hoodsOn)
  const hoodBreaks = useMemo(
    () => classBreaks(hoods.data?.features.map((f) => f.properties.assetCount) ?? []),
    [hoods.data],
  )
  const hoodLegend = useMemo(
    () => legendItems(hoodBreaks, Math.max(0, ...(hoods.data?.features.map((f) => f.properties.assetCount) ?? []))),
    [hoodBreaks, hoods.data],
  )

  const byCategory = useMemo(() => {
    const groups = new Map<string, AssetFeatureCollection['features']>()
    for (const feature of collection?.features ?? []) {
      const list = groups.get(feature.properties.category) ?? []
      list.push(feature)
      groups.set(feature.properties.category, list)
    }
    return groups
  }, [collection])

  const compact = typeof window !== 'undefined' && window.matchMedia('(max-width: 560px)').matches

  return (
    <div className="map-wrapper">
      <MapContainer center={[39.93, 32.8]} zoom={12} className="map" preferCanvas>
        <LayersControl position="topright" collapsed={compact}>
          <LayersControl.BaseLayer checked name="Sokak (OpenStreetMap)">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanlar'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Uydu (Esri)">
            <TileLayer
              attribution="Tiles &copy; Esri &mdash; Maxar, Earthstar Geographics"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Açık (Carto)">
            <TileLayer
              attribution='&copy; OpenStreetMap, &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
              maxZoom={20}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Koyu (Carto)">
            <TileLayer
              attribution='&copy; OpenStreetMap, &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
              maxZoom={20}
            />
          </LayersControl.BaseLayer>

          <LayersControl.Overlay name={HOOD_LAYER_NAME}>
            <LayerGroup>
              {hoodsOn && hoods.data && (
                <NeighborhoodLayer collection={hoods.data} breaks={hoodBreaks} onPick={onPickNeighborhood} />
              )}
            </LayerGroup>
          </LayersControl.Overlay>

          {categories.map((category) => (
            <LayersControl.Overlay key={category} checked name={categoryLabels[category]}>
              <LayerGroup>
                {(byCategory.get(category) ?? []).map((feature) => (
                  <AssetShape
                    key={feature.properties.id}
                    feature={feature}
                    selected={feature.properties.id === selectedId}
                    toolActive={tools.tool !== null}
                    onSelect={onSelect}
                    onOpenDetail={onOpenDetail}
                    registry={registry}
                  />
                ))}
              </LayerGroup>
            </LayersControl.Overlay>
          ))}
        </LayersControl>

        {/* Mahalle katmanı varlıkların altında kalsın diye özel bir pane (z-index 350 < 400). */}
        <Pane name="neighborhoods" style={{ zIndex: 350 }} />
        <OverlayWatcher onChange={setHoodsOn} />

        <MapToolLayers tools={tools} />
        <FitController collection={collection} fitSignal={fitSignal} />
        <SelectionController collection={collection} selectedId={selectedId} registry={registry} />
        {children}
      </MapContainer>

      <MapToolButtons tools={tools} />
      <MapToolPanel tools={tools} onSelect={onSelect} />

      <button className="map-fit" onClick={requestFit} title="Tüm varlıkları göster">
        <ExpandIcon size={16} />
        Tümünü göster
      </button>

      {hoodsOn && (
        <div className="choropleth-legend" aria-label="Mahalle yoğunluğu lejantı">
          <strong>Mahalledeki varlık sayısı</strong>
          {hoods.isFetching && !hoods.data && <span>yükleniyor…</span>}
          {hoodLegend.map((item) => (
            <span key={item.label} className="choropleth-item">
              <i style={{ background: item.color }} />
              {item.label}
            </span>
          ))}
          <span className="choropleth-hint">Mahalleye tıklayarak filtreleyin</span>
        </div>
      )}

      <ul className="legend">
        {categories.map((category) => (
          <li key={category}>
            <span className="dot" style={{ background: categoryColors[category] }} />
            {categoryLabels[category]}
          </li>
        ))}
        <li>
          <span className="dot dashed" /> Bakımda (kırmızı kesikli)
        </li>
        <li>
          <span className="dot faded" /> Pasif (soluk)
        </li>
      </ul>
    </div>
  )
}
