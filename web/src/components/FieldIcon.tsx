import type { FieldType } from '../api/types';
import './FieldIcon.css';

const ICON_CLASS: Partial<Record<FieldType, string>> = {
  text_long: 't-text',
  date: 't-date',
  location: 't-location',
  photo: 't-photo',
  gallery: 't-gallery',
  tag: 't-tag',
};

const GLYPH: Partial<Record<FieldType, string>> = { number: '#', list: '☰' };

// Field-type glyphs drawn in pure CSS, ported from the prototype's
// `.ficon.t-*` classes. `size`: 'lg' inside the 34 px tile, 'sm' inside the
// 24 px tile in Detalle, 'chip' in the add-field chips.
export default function FieldIcon({ type, size = 'lg' }: { type: FieldType; size?: 'lg' | 'sm' | 'chip' }) {
  return (
    <span className={`ficon ficon-${size} ${ICON_CLASS[type] ?? ''}`} aria-hidden="true">
      {GLYPH[type] ?? ''}
    </span>
  );
}

export function FieldIconTile({ type, small = false }: { type: FieldType; small?: boolean }) {
  return (
    <span className={small ? 'ficon-wrap-sm' : 'ficon-wrap'}>
      <FieldIcon type={type} size={small ? 'sm' : 'lg'} />
    </span>
  );
}
