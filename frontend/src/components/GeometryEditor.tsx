import { useEffect, useMemo, useState } from 'react'
import type { Geometry, Position } from 'geojson'
import L from 'leaflet'
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { formatArea, formatLength } from '../lib/format'
import { flip, flipLine, geometryBounds, lineLengthMeters, polygonAreaSquareMeters } from '../lib/geo'
import { LineIcon, PointIcon, PolygonIcon, TrashIcon, UndoIcon, CheckIcon } from './icons'

type Tool = 'point' | 'line' | 'polygon'

interface Props {
  value: Geometry | null
  onChange: (geometry: Geometry | null) => void
}

const handleIcon = L.divIcon({ className: 'vertex-handle', iconSize: [16, 16], iconAnchor: [8, 8] })

const ANKARA: [number, number] = [39.925, 32.855]

// Dialog içinde açılan harita boyutunu geç öğrenir; boyut değişince yeniden hesaplat.
function ResizeFix() {
  const map = useMap()

  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])

  return null
}

// Varlık düzenlenirken haritayı mevcut geometriye odaklar (yalnızca ilk açılışta).
function FitToValue({ value }: { value: Geometry | null }) {
  const map = useMap()

  useEffect(() => {
    if (!value) return
    const bounds = geometryBounds(value)
    if (!bounds.isValid()) return
    if (value.type === 'Point') map.setView(bounds.getCenter(), 16)
    else map.fitBounds(bounds, { padding: [30, 30], maxZoom: 17 })
    // yalnızca açılışta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  return null
}

function ClickToDraw({ active, onClick }: { active: boolean; onClick: (lat: number, lon: number) => void }) {
  const map = useMap()

  useMapEvents({
    click(e) {
      if (active) onClick(e.latlng.lat, e.latlng.lng)
    },
  })

  useEffect(() => {
    map.getContainer().style.cursor = active ? 'crosshair' : ''
    if (active) map.doubleClickZoom.disable()
    else map.doubleClickZoom.enable()
  }, [active, map])

  return null
}

// Mevcut geometrinin köşelerini sürükleyerek düzenleme (tek halkalı alan, çizgi, nokta).
function VertexEditor({ value, onChange }: { value: Geometry; onChange: (g: Geometry) => void }) {
  if (value.type === 'Point') {
    return (
      <Marker
        position={flip(value.coordinates)}
        icon={handleIcon}
        draggable
        eventHandlers={{
          drag: (e) => {
            const { lat, lng } = (e.target as L.Marker).getLatLng()
            onChange({ type: 'Point', coordinates: [lng, lat] })
          },
        }}
      />
    )
  }

  if (value.type === 'LineString') {
    return (
      <>
        {value.coordinates.map((position, index) => (
          <Marker
            key={index}
            position={flip(position)}
            icon={handleIcon}
            draggable
            eventHandlers={{
              drag: (e) => {
                const { lat, lng } = (e.target as L.Marker).getLatLng()
                const next = value.coordinates.map((p, i): Position => (i === index ? [lng, lat] : p))
                onChange({ type: 'LineString', coordinates: next })
              },
            }}
          />
        ))}
      </>
    )
  }

  if (value.type === 'Polygon' && value.coordinates.length === 1) {
    const ring = value.coordinates[0]
    const vertices = ring.slice(0, -1) // son nokta ilkinin kopyası
    return (
      <>
        {vertices.map((position, index) => (
          <Marker
            key={index}
            position={flip(position)}
            icon={handleIcon}
            draggable
            eventHandlers={{
              drag: (e) => {
                const { lat, lng } = (e.target as L.Marker).getLatLng()
                const next = vertices.map((p, i): Position => (i === index ? [lng, lat] : p))
                onChange({ type: 'Polygon', coordinates: [[...next, next[0]]] })
              },
            }}
          />
        ))}
      </>
    )
  }

  return null
}

function ExistingShape({ value }: { value: Geometry }) {
  const style = { color: '#2563eb', weight: 4, fillColor: '#2563eb', fillOpacity: 0.2 }
  switch (value.type) {
    case 'LineString':
      return <Polyline positions={flipLine(value.coordinates)} pathOptions={style} />
    case 'MultiLineString':
      return <Polyline positions={value.coordinates.map(flipLine)} pathOptions={style} />
    case 'Polygon':
      return <Polygon positions={value.coordinates.map(flipLine)} pathOptions={style} />
    case 'MultiPolygon':
      return <Polygon positions={value.coordinates.map((p) => p.map(flipLine))} pathOptions={style} />
    default:
      return null
  }
}

function describe(value: Geometry | null): string {
  if (!value) return 'Henüz geometri çizilmedi.'
  switch (value.type) {
    case 'Point':
      return `Nokta · ${value.coordinates[1].toFixed(5)}, ${value.coordinates[0].toFixed(5)}`
    case 'LineString':
      return `Çizgi · ${value.coordinates.length} köşe · ${formatLength(lineLengthMeters(value.coordinates))}`
    case 'Polygon':
      return `Alan · ${value.coordinates[0].length - 1} köşe · ${formatArea(polygonAreaSquareMeters(value.coordinates[0].slice(0, -1)))}`
    default:
      return `${value.type} (çok parçalı geometri; yeniden çizerek değiştirebilirsiniz)`
  }
}

export function GeometryEditor({ value, onChange }: Props) {
  const [tool, setTool] = useState<Tool | null>(null)
  const [draft, setDraft] = useState<[number, number][]>([]) // [enlem, boylam]

  const minVertices = tool === 'polygon' ? 3 : tool === 'line' ? 2 : 1
  const canFinish = tool !== null && tool !== 'point' && draft.length >= minVertices

  function startTool(next: Tool) {
    setTool(next)
    setDraft([])
  }

  function cancelDrawing() {
    setTool(null)
    setDraft([])
  }

  function handleMapClick(lat: number, lon: number) {
    if (tool === 'point') {
      onChange({ type: 'Point', coordinates: [lon, lat] })
      cancelDrawing()
      return
    }
    setDraft((d) => [...d, [lat, lon]])
  }

  function finish() {
    const positions = draft.map(([lat, lon]): Position => [lon, lat])
    if (tool === 'line') onChange({ type: 'LineString', coordinates: positions })
    if (tool === 'polygon') onChange({ type: 'Polygon', coordinates: [[...positions, positions[0]]] })
    cancelDrawing()
  }

  const draftInfo = useMemo(() => {
    if (draft.length === 0) return null
    const positions = draft.map(([lat, lon]): Position => [lon, lat])
    if (tool === 'polygon' && draft.length >= 3) return formatArea(polygonAreaSquareMeters(positions))
    if (tool === 'line' && draft.length >= 2) return formatLength(lineLengthMeters(positions))
    return `${draft.length} köşe`
  }, [draft, tool])

  const center = value ? undefined : ANKARA

  return (
    <div className="geo-editor">
      <div className="geo-toolbar">
        <button type="button" className={`tool ${tool === 'point' ? 'active' : ''}`} onClick={() => startTool('point')}>
          <PointIcon size={16} /> Nokta
        </button>
        <button type="button" className={`tool ${tool === 'line' ? 'active' : ''}`} onClick={() => startTool('line')}>
          <LineIcon size={16} /> Çizgi
        </button>
        <button type="button" className={`tool ${tool === 'polygon' ? 'active' : ''}`} onClick={() => startTool('polygon')}>
          <PolygonIcon size={16} /> Alan
        </button>

        <span className="geo-spacer" />

        {tool && tool !== 'point' && (
          <>
            <button
              type="button"
              className="tool"
              onClick={() => setDraft((d) => d.slice(0, -1))}
              disabled={draft.length === 0}
            >
              <UndoIcon size={16} /> Geri al
            </button>
            <button type="button" className="tool finish" onClick={finish} disabled={!canFinish}>
              <CheckIcon size={16} /> Bitir
            </button>
          </>
        )}
        {tool && (
          <button type="button" className="tool" onClick={cancelDrawing}>
            Vazgeç
          </button>
        )}
        {!tool && value && (
          <button type="button" className="tool danger" onClick={() => onChange(null)}>
            <TrashIcon size={16} /> Temizle
          </button>
        )}
      </div>

      <MapContainer center={center ?? [0, 0]} zoom={13} className="editor-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <ResizeFix />
        <FitToValue value={value} />
        <ClickToDraw active={tool !== null} onClick={handleMapClick} />

        {value && <ExistingShape value={value} />}
        {value && !tool && <VertexEditor value={value} onChange={onChange} />}

        {tool === 'line' && draft.length > 1 && (
          <Polyline positions={draft} pathOptions={{ color: '#f59e0b', weight: 4, dashArray: '6 6' }} />
        )}
        {tool === 'polygon' && draft.length > 1 && (
          <Polygon
            positions={draft}
            pathOptions={{ color: '#f59e0b', weight: 3, dashArray: '6 6', fillOpacity: 0.15 }}
          />
        )}
        {draft.map((position, index) => (
          <CircleMarker
            key={index}
            center={position}
            radius={5}
            pathOptions={{ color: '#b45309', fillColor: '#fbbf24', fillOpacity: 1, weight: 2 }}
          />
        ))}
      </MapContainer>

      <div className="geo-status" aria-live="polite">
        {tool
          ? tool === 'point'
            ? 'Haritaya tıklayarak noktayı yerleştirin.'
            : `Köşeleri haritaya tıklayarak ekleyin${draftInfo ? ` · ${draftInfo}` : ''} · bitirince "Bitir"e basın.`
          : describe(value)}
      </div>
    </div>
  )
}
