import { lazy, Suspense } from 'react';
import type { LocationValue } from '../constants/fieldDefs';
import './MapPreview.css';

// Leaflet is only downloaded when a map is actually shown.
const PreviewMap = lazy(() => import('./map/PreviewMap'));

export function navigationUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

// Mini map with a pin, the label and an "Abrir navegación" button. The map is
// purely informational; only the explicit button opens navigation (a
// whole-card tap target fired on ordinary scrolls in the native app).
// Without coordinates (old rows from the Expo web build) only the label shows.
export default function MapPreview({ value, height = 140, interactive = true }: { value: LocationValue; height?: number; interactive?: boolean }) {
  const hasCoords = value.lat != null && value.lng != null;
  if (!hasCoords) {
    return (
      <div className="map-preview map-preview-static" style={{ height }}>
        <span className="map-preview-pin" aria-hidden="true">
          📍
        </span>
        <span className="map-preview-static-label">{value.label}</span>
      </div>
    );
  }
  return (
    <div className="map-preview" style={{ height }}>
      <Suspense fallback={null}>
        <PreviewMap lat={value.lat!} lng={value.lng!} />
      </Suspense>
      {!!value.label && <span className="map-preview-label">{value.label}</span>}
      {interactive && (
        <a className="map-preview-nav" href={navigationUrl(value.lat!, value.lng!)} target="_blank" rel="noopener noreferrer" aria-label="Abrir navegación">
          ↗
        </a>
      )}
    </div>
  );
}
