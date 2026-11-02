import { useEffect } from 'react';
import { AttributionControl, MapContainer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { LocationPin } from '../../api/types';
import { Photo, PhotoStripe, ScoreBadge } from '../bits';
import { DEFAULT_CENTER, Tiles, pinIcon } from './mapBase';

function FitAll({ pins }: { pins: LocationPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16, animate: false });
  }, [map, pins]);
  return null;
}

// One pin per location field; tapping a pin opens its callout (cover,
// title, average score) and tapping the callout opens the score.
export default function LocationsMap({ pins, onOpen }: { pins: LocationPin[]; onOpen: (scoreId: string) => void }) {
  return (
    <MapContainer center={DEFAULT_CENTER} zoom={pins.length ? 6 : 12} className="locations-map" zoomControl={false} attributionControl={false}>
      <AttributionControl position="bottomright" prefix={false} />
      <Tiles />
      <FitAll pins={pins} />
      {pins.map((p, idx) => (
        <Marker key={`${p.scoreId}-${idx}`} position={[p.lat, p.lng]} icon={pinIcon} title={p.title}>
          <Popup className="map-popup" closeButton={false} autoPanPadding={[24, 24]}>
            {/* A small card: big cover on top, title, place and score below. */}
            <button type="button" className="map-callout" onClick={() => onOpen(p.scoreId)} aria-label={`Abrir ${p.title}`}>
              {p.coverUrl ? (
                <Photo url={p.coverUrl} thumb sizes="240px" className="map-callout-photo" />
              ) : (
                <PhotoStripe id={p.scoreId} className="map-callout-photo" stripe={12} />
              )}
              <span className="map-callout-body">
                <span className="map-callout-text">
                  <span className="map-callout-title">{p.title}</span>
                  {!!p.label && <span className="map-callout-label">{p.label}</span>}
                </span>
                {p.avgScore != null && <ScoreBadge value={p.avgScore} size={32} />}
              </span>
            </button>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
