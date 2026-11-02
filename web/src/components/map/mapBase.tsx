import L from 'leaflet';
import { TileLayer } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { AppConfig } from '../../api/types';
import 'leaflet/dist/leaflet.css';
import './map.css';

// No location stored yet: maps start over València (doc 05).
export const DEFAULT_CENTER: [number, number] = [39.4699, -0.3763];
const FALLBACK_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// The tile provider is server configuration (MAP_TILE_URL), so it can move
// to a paid or self-hosted provider without a rebuild.
export function Tiles() {
  const { data } = useQuery({ queryKey: ['config'], queryFn: () => api.get<AppConfig>('/api/config'), staleTime: Infinity });
  const url = data?.mapTileUrl || FALLBACK_TILES;
  return <TileLayer key={url} url={url} attribution="© OpenStreetMap contributors" maxZoom={19} />;
}

// A CSS pin instead of Leaflet's default PNG markers (no image paths to fix
// up in the bundle).
export const pinIcon = L.divIcon({
  className: 'map-pin-icon',
  html: '<span class="map-pin"></span>',
  iconSize: [26, 34],
  iconAnchor: [13, 34],
  popupAnchor: [0, -30],
});
