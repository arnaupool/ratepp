import { AttributionControl, MapContainer, Marker } from 'react-leaflet';
import { Tiles, pinIcon } from './mapBase';

// Static mini map for Detalle: no dragging or zooming, so scrolling the page
// over it never moves it (or opens anything).
export default function PreviewMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={16}
      className="map-preview-map"
      dragging={false}
      touchZoom={false}
      doubleClickZoom={false}
      scrollWheelZoom={false}
      boxZoom={false}
      keyboard={false}
      zoomControl={false}
      attributionControl={false}
    >
      {/* Top right: the bottom corners hold the label and the navigation button. */}
      <AttributionControl position="topright" prefix={false} />
      <Tiles />
      <Marker position={[lat, lng]} icon={pinIcon} interactive={false} keyboard={false} />
    </MapContainer>
  );
}
