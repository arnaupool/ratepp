import { api } from './client';

export const coversApi = {
  search: (type, q) => api.get(`/api/covers/search?type=${encodeURIComponent(type)}&q=${encodeURIComponent(q)}`),
};
