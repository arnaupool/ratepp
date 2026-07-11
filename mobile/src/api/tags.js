import { api } from './client';

export const tagsApi = {
  list: () => api.get('/api/tags'),
};
