import { useEffect, useState } from 'react';
import type { LocationValue } from '../../constants/fieldDefs';
import Sheet from '../Sheet';

interface Props {
  visible: boolean;
  initialValue: LocationValue | null;
  onClose: () => void;
  onConfirm: (value: LocationValue) => void;
}

// Provisional picker (phase 4): typed label plus the browser's location.
// Replaced by the map picker in phase 6.
export default function LocationPicker({ visible, initialValue, onClose, onConfirm }: Props) {
  const [label, setLabel] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!visible) return;
    setLabel(initialValue?.label ?? '');
    setCoords(initialValue?.lat != null && initialValue.lng != null ? { lat: initialValue.lat, lng: initialValue.lng } : null);
  }, [visible, initialValue]);

  return (
    <Sheet visible={visible} onClose={onClose} label="Elegir ubicación">
      <h2 className="sheet-title">Elegir ubicación</h2>
      <input className="sheet-input" placeholder="Buscar dirección..." value={label} onChange={(e) => setLabel(e.target.value)} />
      <button
        type="button"
        className="link-btn"
        onClick={() => navigator.geolocation?.getCurrentPosition((p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }))}
      >
        📍 Usar mi ubicación actual
      </button>
      <div className="sheet-actions">
        <button type="button" className="sheet-btn-text" onClick={onClose}>
          Cancelar
        </button>
        <button
          type="button"
          className="sheet-btn-main"
          disabled={!label.trim() && !coords}
          onClick={() => onConfirm({ label: label.trim(), lat: coords?.lat ?? null, lng: coords?.lng ?? null })}
        >
          Confirmar ubicación
        </button>
      </div>
    </Sheet>
  );
}
