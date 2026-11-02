import { useState, type ReactNode } from 'react';
import { pastelize } from '../../utils/colors';

// Pastel swatches matching the built-in category tints.
const PRESETS = ['#f6c9c9', '#f6ddb8', '#f3ecb0', '#cfe8b8', '#b9e3d0', '#b9e0e8', '#bcd4f0', '#c9c3ee', '#e2c3ee', '#eec3dc'];

// AUTO (back to the category tint), the photo suggestion if any (softened to
// pastel; only ever a suggestion, never applied by itself), then the presets.
export function ColorPicker({ value, onChange, suggestedColor }: { value: string | null; onChange: (c: string | null) => void; suggestedColor: string | null }) {
  const suggested = suggestedColor ? pastelize(suggestedColor) : null;
  return (
    <div className="color-picker">
      <button type="button" className={`swatch swatch-auto${!value ? ' on' : ''}`} onClick={() => onChange(null)} aria-label="Color automático según categoría" aria-pressed={!value}>
        AUTO
      </button>
      {suggested && (
        <button
          type="button"
          className={`swatch${value === suggested ? ' on' : ''}`}
          style={{ background: suggested }}
          onClick={() => onChange(suggested)}
          aria-label="Color sugerido de la portada"
          aria-pressed={value === suggested}
        >
          📷
        </button>
      )}
      {PRESETS.map((c) => (
        <button
          type="button"
          key={c}
          className={`swatch${value === c ? ' on' : ''}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
          aria-label={`Color ${c}`}
          aria-pressed={value === c}
        />
      ))}
    </div>
  );
}

export function CollapsibleSection({ title, children, subColor }: { title: string; children: ReactNode; subColor?: string }) {
  const [open, setOpen] = useState(false);
  const style = subColor ? { color: subColor } : undefined;
  return (
    <div className="collapsible">
      <button type="button" className="collapsible-head" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={`${open ? 'Ocultar' : 'Mostrar'} ${title}`}>
        <span className="t-section-label" style={style}>
          {title}
        </span>
        <span className="collapsible-chevron" style={style}>
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  );
}
