import { api } from './client';

export const scoresApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.category) qs.set('category', params.category);
    if (params.tag) qs.set('tag', params.tag);
    if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
    if (params.dateTo) qs.set('dateTo', params.dateTo);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get(`/api/scores${suffix}`);
  },
  get: (id) => api.get(`/api/scores/${id}`),
  locations: () => api.get('/api/scores/locations'),
  create: (payload) => api.post('/api/scores', payload),
  update: (id, payload) => api.patch(`/api/scores/${id}`, payload),
  remove: (id) => api.del(`/api/scores/${id}`),

  addRating: (scoreId, payload) => api.post(`/api/scores/${scoreId}/ratings`, payload),
  updateRating: (scoreId, ratingId, payload) => api.patch(`/api/scores/${scoreId}/ratings/${ratingId}`, payload),
  removeRating: (scoreId, ratingId) => api.del(`/api/scores/${scoreId}/ratings/${ratingId}`),

  addField: (scoreId, payload) => api.post(`/api/scores/${scoreId}/fields`, payload),
  updateField: (scoreId, fieldId, payload) => api.patch(`/api/scores/${scoreId}/fields/${fieldId}`, payload),
  removeField: (scoreId, fieldId) => api.del(`/api/scores/${scoreId}/fields/${fieldId}`),
  reorderFields: (scoreId, order) => api.post(`/api/scores/${scoreId}/fields/reorder`, { order }),
};
