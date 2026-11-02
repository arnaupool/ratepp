import type { LocationValue } from '../constants/fieldDefs';
import './MapPreview.css';

export function navigationUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

// Location preview: label plus a navigation button. The map itself is
// purely informational; only the explicit button opens navigation (a
// whole-card tap target fired on ordinary scrolls in the native app).
export default function MapPreview({ value, height = 140 }: { value: LocationValue; height?: number }) {
  const hasCoords = value.lat != null && value.lng != null;
  return (
    <div className="map-preview map-preview-static" style={{ height }}>
      <span className="map-preview-pin" aria-hidden="true">
        📍
      </span>
      <span className="map-preview-static-label">{value.label || (hasCoords ? `${value.lat}, ${value.lng}` : '')}</span>
      {hasCoords && (
        <a className="map-preview-nav" href={navigationUrl(value.lat!, value.lng!)} target="_blank" rel="noopener noreferrer" aria-label="Abrir navegación">
          ↗
        </a>
      )}
    </div>
  );
}
