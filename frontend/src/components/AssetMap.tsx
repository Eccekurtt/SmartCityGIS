import { useEffect, useRef } from 'react'
import type { CircleMarker as LeafletCircleMarker } from 'leaflet'
import { CircleMarker, LayerGroup, LayersControl, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { categoryColors, categoryLabels, statusLabels } from '../labels'
import type { Asset, AssetCategory } from '../types'

interface Props {
  assets: Asset[]
  selectedId: number | null
  onSelect: (id: number) => void
}

const categories = Object.keys(categoryLabels) as AssetCategory[]

// Seçili varlığa doğru haritayı kaydırır.
function FlyToSelected({ asset }: { asset: Asset | undefined }) {
  const map = useMap()
  const latitude = asset?.latitude
  const longitude = asset?.longitude

  useEffect(() => {
    if (latitude !== undefined && longitude !== undefined) {
      map.flyTo([latitude, longitude], Math.max(map.getZoom(), 14), { duration: 0.6 })
    }
  }, [map, latitude, longitude])

  return null
}

export function AssetMap({ assets, selectedId, onSelect }: Props) {
  // Her işaretçinin Leaflet nesnesini saklarız; seçilince popup'ını açmak için.
  const markers = useRef<Record<number, LeafletCircleMarker>>({})
  const selected = assets.find((a) => a.id === selectedId)

  useEffect(() => {
    if (selectedId !== null) markers.current[selectedId]?.openPopup()
  }, [selectedId])

  return (
    <div className="map-wrapper">
      <MapContainer center={[39.93, 32.8]} zoom={12} className="map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanlar'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FlyToSelected asset={selected} />

        {/* Dar ekranda katman kutusu haritayı kapatmasın diye kapalı başlar. */}
        <LayersControl position="topright" collapsed={window.matchMedia('(max-width: 560px)').matches}>
          {categories.map((category) => (
            <LayersControl.Overlay key={category} checked name={categoryLabels[category]}>
              <LayerGroup>
                {assets
                  .filter((a) => a.category === category)
                  .map((asset) => {
                    const isSelected = asset.id === selectedId
                    return (
                      <CircleMarker
                        key={asset.id}
                        ref={(marker) => {
                          if (marker) markers.current[asset.id] = marker
                          else delete markers.current[asset.id]
                        }}
                        center={[asset.latitude, asset.longitude]}
                        radius={isSelected ? 13 : 9}
                        pathOptions={{
                          fillColor: categoryColors[category],
                          fillOpacity: asset.status === 'Inactive' ? 0.3 : 0.85,
                          // Bakımdaki varlıklar kırmızı kesikli çerçeveyle ayırt edilir.
                          color: asset.status === 'UnderMaintenance' ? '#dc2626' : '#1f2937',
                          dashArray: asset.status === 'UnderMaintenance' ? '3 3' : undefined,
                          weight: isSelected ? 4 : 2,
                        }}
                        eventHandlers={{ click: () => onSelect(asset.id) }}
                      >
                        <Popup>
                          <strong>{asset.name}</strong>
                          <br />
                          {categoryLabels[asset.category]} · {statusLabels[asset.status]}
                          <br />
                          {asset.neighborhood}
                          <br />
                          <small>
                            {asset.latitude.toFixed(5)}, {asset.longitude.toFixed(5)}
                          </small>
                          {asset.description && (
                            <>
                              <br />
                              <em>{asset.description}</em>
                            </>
                          )}
                        </Popup>
                      </CircleMarker>
                    )
                  })}
              </LayerGroup>
            </LayersControl.Overlay>
          ))}
        </LayersControl>
      </MapContainer>

      <ul className="legend">
        {categories.map((category) => (
          <li key={category}>
            <span className="dot" style={{ background: categoryColors[category] }} />
            {categoryLabels[category]}
          </li>
        ))}
        <li>
          <span className="dot dashed" /> Bakımda
        </li>
        <li>
          <span className="dot faded" /> Pasif
        </li>
      </ul>
    </div>
  )
}
