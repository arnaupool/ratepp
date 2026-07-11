import { api } from './client';

export const colorsApi = {
  // Best-effort suggestion — callers should treat a null/failed response as
  // "no suggestion available" rather than an error.
  dominant: (url) => api.get(`/api/color?url=${encodeURIComponent(url)}`),
};
