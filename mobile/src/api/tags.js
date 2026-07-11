import { api } from './client';

export const tagsApi = {
  list: () => api.get('/api/tags'),
  remove: (name) => api.del(`/api/tags/${encodeURIComponent(name)}`),
};
