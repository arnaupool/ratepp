import type { FieldType } from '../api/types';

export type FieldKind =
  | 'simple'
  | 'date'
  | 'location'
  | 'gallery'
  | 'list'
  | 'tag'
  | 'price'
  | 'criteria'
  | 'duration'
  | 'link'
  | 'boolean'
  | 'ingredients'
  | 'steps'
  | 'difficulty';

export interface FieldDef {
  id: FieldType;
  label: string;
  kind: FieldKind;
  placeholder: string;
  numeric?: boolean;
}

// Types offered when adding a field: the original seven, then the ones added
// after the Expo app was retired (value shapes in utils/fields.ts). The
// legacy 'photo' type is no longer offered; old rows show as a gallery of one.
export const FIELD_DEFS: FieldDef[] = [
  { id: 'text_long', label: 'Texto', kind: 'simple', placeholder: 'Escribe tus notas...' },
  { id: 'number', label: 'Número', kind: 'simple', placeholder: 'Ej. 24.50', numeric: true },
  { id: 'date', label: 'Fecha', kind: 'date', placeholder: '' },
  { id: 'location', label: 'Ubicación', kind: 'location', placeholder: '' },
  { id: 'gallery', label: 'Galería', kind: 'gallery', placeholder: '' },
  { id: 'list', label: 'Lista de ítems', kind: 'list', placeholder: '' },
  { id: 'tag', label: 'Etiqueta', kind: 'tag', placeholder: 'Ej. Mediterránea' },
  { id: 'price', label: 'Precio', kind: 'price', placeholder: '' },
  { id: 'criteria', label: 'Criterios', kind: 'criteria', placeholder: '' },
  { id: 'duration', label: 'Tiempo', kind: 'duration', placeholder: '' },
  { id: 'link', label: 'Enlace', kind: 'link', placeholder: '' },
  { id: 'boolean', label: 'Sí / No', kind: 'boolean', placeholder: '' },
  { id: 'ingredients', label: 'Ingredientes', kind: 'ingredients', placeholder: '' },
  { id: 'steps', label: 'Pasos', kind: 'steps', placeholder: '' },
  { id: 'difficulty', label: 'Dificultad', kind: 'difficulty', placeholder: '' },
];

export function fieldDef(type: FieldType): FieldDef | undefined {
  if (type === 'photo') return { id: 'photo', label: 'Foto', kind: 'gallery', placeholder: '' };
  return FIELD_DEFS.find((d) => d.id === type);
}

export function defaultFieldValue(kind: FieldKind): unknown {
  if (kind === 'list' || kind === 'steps') return [''];
  if (kind === 'price') return { amount: '', currency: 'EUR', per: 'person', people: null };
  if (kind === 'criteria') return [{ name: '', value: null }];
  if (kind === 'link') return { url: '', title: '' };
  if (kind === 'ingredients') return { servings: null, items: [{ qty: '', unit: '', name: '' }] };
  if (kind === 'duration' || kind === 'boolean' || kind === 'difficulty') return null;
  if (kind === 'gallery') return [];
  if (kind === 'tag') return [];
  if (kind === 'date' || kind === 'location') return null;
  return '';
}

export const COVER_TYPES = [
  { id: 'movie', label: 'Película' },
  { id: 'tv', label: 'Serie' },
  { id: 'game', label: 'Videojuego' },
  { id: 'book', label: 'Libro' },
] as const;

export const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const DEFAULT_CATEGORIES = ['Restaurantes', 'Películas', 'Recuerdos'];

// Readers for stored field values. Old rows may not match the current shape
// (a scalar tag, a single legacy photo), so these never throw.
export function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string' && value) return [value];
  return [];
}

export function asText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

export interface LocationValue {
  label: string;
  lat: number | null;
  lng: number | null;
}

export function asLocation(value: unknown): LocationValue | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const lat = typeof v.lat === 'number' ? v.lat : v.lat != null && v.lat !== '' ? Number(v.lat) : null;
  const lng = typeof v.lng === 'number' ? v.lng : v.lng != null && v.lng !== '' ? Number(v.lng) : null;
  return {
    label: typeof v.label === 'string' ? v.label : '',
    lat: lat !== null && Number.isFinite(lat) ? lat : null,
    lng: lng !== null && Number.isFinite(lng) ? lng : null,
  };
}
