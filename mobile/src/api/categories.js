import { api } from './client';

export const categoriesApi = {
  list: () => api.get('/api/categories'),
  remove: (name) => api.del(`/api/categories/${encodeURIComponent(name)}`),
};
