import { useEffect, useRef } from 'react';
import { AttributionControl, MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { DEFAULT_CENTER, Tiles, pinIcon } from './mapBase';

interface Props {
  point: { lat: number; lng: number } | null;
  onPick: (lat: number, lng: number) => void;
}

// Only deliberate taps place the pin: Leaflet already drops the click that
// ends a drag, and on top of that a press that moved more than a few pixels
// or lasted long is ignored (the native picker was too sensitive and moved
// the pin while panning).
function TapToPick({ onPick }: { onPick: Props['onPick'] }) {
  const down = useRef<{ x: number; y: number; t: number } | null>(null);
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const start = (e: PointerEvent) => {
      down.current = e.isPrimary ? { x: e.clientX, y: e.clientY, t: Date.now() } : null;
    };
    el.addEventListener('pointerdown', start);
    return () => el.removeEventListener('pointerdown', start);
  }, [map]);
  useMapEvents({
    click(e) {
      const d = down.current;
      const ev = e.originalEvent as MouseEvent;
      if (d && (Math.hypot(ev.clientX - d.x, ev.clientY - d.y) > 8 || Date.now() - d.t > 600)) return;
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FollowPoint({ point }: { point: Props['point'] }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), 16), { duration: 0.3 });
  }, [map, point]);
  return null;
}

export default function PickerMap({ point, onPick }: Props) {
  return (
    <MapContainer
      center={point ? [point.lat, point.lng] : DEFAULT_CENTER}
      zoom={point ? 16 : 13}
      className="picker-map"
      zoomControl={false}
      attributionControl={false}
    >
      <AttributionControl position="bottomright" prefix={false} />
      <Tiles />
      <TapToPick onPick={onPick} />
      <FollowPoint point={point} />
      {point && <Marker position={[point.lat, point.lng]} icon={pinIcon} interactive={false} />}
    </MapContainer>
  );
}
