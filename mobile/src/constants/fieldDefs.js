// Ported from FIELD_DEFS in Puntuaciones App.dc.html.
export const FIELD_DEFS = [
  { id: 'text_long', label: 'Texto largo', icon: 'text', kind: 'simple', placeholder: 'Escribe tus notas...' },
  { id: 'number', label: 'Número', icon: 'number', kind: 'simple', placeholder: 'Ej. 24.50', keyboardType: 'decimal-pad' },
  { id: 'date', label: 'Fecha', icon: 'date', kind: 'date', placeholder: '' },
  { id: 'location', label: 'Ubicación', icon: 'location', kind: 'location', placeholder: '' },
  { id: 'gallery', label: 'Galería', icon: 'gallery', kind: 'gallery', placeholder: '' },
  { id: 'list', label: 'Lista de ítems', icon: 'list', kind: 'list', placeholder: '' },
  { id: 'tag', label: 'Etiqueta', icon: 'tag', kind: 'tag', placeholder: 'Ej. Mediterránea' },
];

export const QUICK_FIELD_DEFS = FIELD_DEFS.slice(0, 4);
export const MORE_FIELD_DEFS = FIELD_DEFS.slice(4);

export function fieldDef(typeId) {
  return FIELD_DEFS.find((d) => d.id === typeId);
}

export function defaultFieldValue(kind) {
  if (kind === 'list') return [''];
  if (kind === 'gallery') return [];
  if (kind === 'date') return null;
  if (kind === 'location') return null;
  if (kind === 'tag') return [];
  return '';
}

export const COVER_TYPES = [
  { id: 'movie', label: 'Película' },
  { id: 'tv', label: 'Serie' },
  { id: 'game', label: 'Videojuego' },
  { id: 'book', label: 'Libro' },
];

export const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const DEFAULT_CATEGORIES = ['Restaurantes', 'Películas', 'Recuerdos'];
