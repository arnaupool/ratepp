import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react';
import { geoApi } from '../../api/endpoints';
import type { LocationValue } from '../../constants/fieldDefs';
import Sheet from '../Sheet';
import { Spinner } from '../bits';

const PickerMap = lazy(() => import('../map/PickerMap'));

interface Props {
  visible: boolean;
  initialValue: LocationValue | null;
  onClose: () => void;
  onConfirm: (value: LocationValue) => void;
}

const coordsLabel = (lat: number, lng: number) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

// "Elegir ubicación": search an address, use the device's position (needs
// HTTPS), or tap the map. The label comes from reverse geocoding, or
// "lat, lng" when that fails.
export default function LocationPicker({ visible, initialValue, onClose, onConfirm }: Props) {
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [label, setLabel] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setPoint(initialValue?.lat != null && initialValue.lng != null ? { lat: initialValue.lat, lng: initialValue.lng } : null);
    setLabel(initialValue?.label ?? '');
    setSearch('');
  }, [visible, initialValue]);

  const applyPoint = async (lat: number, lng: number, knownLabel?: string) => {
    setPoint({ lat, lng });
    if (knownLabel) {
      setLabel(knownLabel);
      return;
    }
    setBusy(true);
    try {
      const { label: found } = await geoApi.reverse(lat, lng);
      setLabel(found || coordsLabel(lat, lng));
    } catch {
      setLabel(coordsLabel(lat, lng));
    } finally {
      setBusy(false);
    }
  };

  const runSearch = async (e?: FormEvent) => {
    e?.preventDefault();
    const q = search.trim();
    if (!q) return;
    (document.activeElement as HTMLElement | null)?.blur();
    setBusy(true);
    try {
      const { results } = await geoApi.search(q);
      // Like the native app, the typed text becomes the label.
      if (results[0]) await applyPoint(results[0].lat, results[0].lng, q);
    } catch {
      // no match or geocoder down: keep the current pin
    } finally {
      setBusy(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        applyPoint(pos.coords.latitude, pos.coords.longitude);
      },
      // Denied or unavailable (e.g. plain HTTP): search or tap instead.
      () => setBusy(false),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <Sheet visible={visible} onClose={onClose} label="Elegir ubicación">
      <h2 className="sheet-title">Elegir ubicación</h2>
      <form className="sheet-search-row" onSubmit={runSearch}>
        <input
          className="sheet-input"
          type="search"
          enterKeyHint="search"
          placeholder="Buscar dirección..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="sheet-search-btn" aria-label="Buscar dirección">
          🔍
        </button>
      </form>
      <button type="button" className="link-btn location-current" onClick={useCurrentLocation}>
        📍 Usar mi ubicación actual
      </button>
      <div className="location-map">
        {visible && (
          <Suspense fallback={null}>
            <PickerMap point={point} onPick={(lat, lng) => applyPoint(lat, lng)} />
          </Suspense>
        )}
        {busy && (
          <div className="location-busy">
            <Spinner />
          </div>
        )}
      </div>
      {!!label && <p className="location-label">{label}</p>}
      <div className="sheet-actions">
        <button type="button" className="sheet-btn-text" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="sheet-btn-main" disabled={!point} onClick={() => point && onConfirm({ label, lat: point.lat, lng: point.lng })}>
          Confirmar ubicación
        </button>
      </div>
    </Sheet>
  );
}
