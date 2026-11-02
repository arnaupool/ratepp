import { api } from './client';
import type { Field, FieldType, LocationPin, Rating, ScoreDetail, ScoreSummary } from './types';

// Image URLs are kept exactly as the API returns them and only normalized at
// render time (utils/images.ts). Writing normalized (relative) URLs back
// would break them for the Expo app, which still reads the same rows.

export interface ScoreFilters {
  search?: string;
  category?: string;
  tag?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export interface NewScore {
  title: string;
  categories: string[];
  photoUrls: string[];
  cardColor: string | null;
  ownerValue: number;
  ratings: { personName: string; value: number }[];
  fields: { type: FieldType; label: string; value: unknown }[];
}

export const scoresApi = {
  list: (f: ScoreFilters = {}) => {
    const qs = new URLSearchParams();
    if (f.search) qs.set('search', f.search);
    if (f.category) qs.set('category', f.category);
    if (f.tag) qs.set('tag', f.tag);
    if (f.dateFrom) qs.set('dateFrom', f.dateFrom);
    if (f.dateTo) qs.set('dateTo', f.dateTo);
    const suffix = qs.toString() ? `?${qs}` : '';
    return api.get<{ items: ScoreSummary[] }>(`/api/scores${suffix}`);
  },
  get: (id: string) => api.get<{ score: ScoreDetail }>(`/api/scores/${encodeURIComponent(id)}`),
  locations: () => api.get<{ locations: LocationPin[] }>('/api/scores/locations'),
  create: (payload: NewScore) => api.post<{ score: ScoreDetail }>('/api/scores', payload),
  update: (id: string, payload: Partial<Pick<ScoreSummary, 'title' | 'categories' | 'photoUrls' | 'cardColor'>>) =>
    api.patch<{ score: ScoreDetail }>(`/api/scores/${id}`, payload),
  remove: (id: string) => api.del(`/api/scores/${id}`),

  addRating: (id: string, payload: { personName: string; value: number }) => api.post<{ rating: Rating }>(`/api/scores/${id}/ratings`, payload),
  updateRating: (id: string, ratingId: string, payload: { personName?: string; value?: number }) =>
    api.patch<{ rating: Rating }>(`/api/scores/${id}/ratings/${ratingId}`, payload),
  removeRating: (id: string, ratingId: string) => api.del(`/api/scores/${id}/ratings/${ratingId}`),

  addField: (id: string, payload: { type: FieldType; label: string; value: unknown }) => api.post<{ field: Field }>(`/api/scores/${id}/fields`, payload),
  updateField: (id: string, fieldId: string, payload: { label?: string; value?: unknown }) =>
    api.patch<{ field: Field }>(`/api/scores/${id}/fields/${fieldId}`, payload),
  removeField: (id: string, fieldId: string) => api.del(`/api/scores/${id}/fields/${fieldId}`),
  reorderFields: (id: string, order: string[]) => api.post<{ fields: Field[] }>(`/api/scores/${id}/fields/reorder`, { order }),
};

export const categoriesApi = {
  list: () => api.get<{ categories: string[] }>('/api/categories'),
  remove: (name: string) => api.del(`/api/categories/${encodeURIComponent(name)}`),
};

export const tagsApi = {
  list: () => api.get<{ tags: string[] }>('/api/tags'),
  remove: (name: string) => api.del(`/api/tags/${encodeURIComponent(name)}`),
};

export const colorsApi = {
  dominant: (url: string) => api.get<{ color: string | null }>(`/api/color?url=${encodeURIComponent(url)}`),
};

export interface CoverResult {
  id: string;
  title: string;
  subtitle: string | null;
  posterUrl: string;
}

export const coversApi = {
  search: (type: string, q: string) =>
    api.get<{ results: CoverResult[]; note?: string }>(`/api/covers/search?type=${encodeURIComponent(type)}&q=${encodeURIComponent(q)}`),
};

export const uploadsApi = {
  upload: (blob: Blob, filename: string) => {
    const form = new FormData();
    form.append('photo', blob, filename);
    return api.upload<{ url: string }>('/api/uploads', form);
  },
};

export interface GeoResult {
  label: string;
  lat: number;
  lng: number;
}

export const geoApi = {
  search: (q: string) => api.get<{ results: GeoResult[] }>(`/api/geo/search?q=${encodeURIComponent(q)}`),
  reverse: (lat: number, lng: number) => api.get<{ label: string | null }>(`/api/geo/reverse?lat=${lat}&lng=${lng}`),
};
