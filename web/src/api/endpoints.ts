import { api } from './client';
import type { AdminStats, AdminUser, Field, FieldType, GroupInvite, GroupMember, GroupSummary, LocationPin, Rating, ScoreDetail, ScoreSummary } from './types';

/** 'all' (personal + my groups), 'me' (personal) or a group id. */
export type Space = string;

// Image URLs are kept exactly as the API returns them and only normalized at
// render time (utils/images.ts). Writing normalized (relative) URLs back
// would break them for the Expo app, which still reads the same rows.

export interface ScoreFilters {
  space?: Space;
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
  /** A group to create it in; personal when absent. */
  groupId?: string | null;
}

export const scoresApi = {
  list: (f: ScoreFilters = {}) => {
    const qs = new URLSearchParams();
    if (f.space) qs.set('space', f.space);
    if (f.search) qs.set('search', f.search);
    if (f.category) qs.set('category', f.category);
    if (f.tag) qs.set('tag', f.tag);
    if (f.dateFrom) qs.set('dateFrom', f.dateFrom);
    if (f.dateTo) qs.set('dateTo', f.dateTo);
    const suffix = qs.toString() ? `?${qs}` : '';
    return api.get<{ items: ScoreSummary[] }>(`/api/scores${suffix}`);
  },
  get: (id: string) => api.get<{ score: ScoreDetail }>(`/api/scores/${encodeURIComponent(id)}`),
  locations: (space: Space = 'all') => api.get<{ locations: LocationPin[] }>(`/api/scores/locations?space=${encodeURIComponent(space)}`),
  create: (payload: NewScore) => api.post<{ score: ScoreDetail }>('/api/scores', payload),
  /** `score` is null when the move took the note out of your reach. */
  update: (id: string, payload: Partial<Pick<ScoreSummary, 'title' | 'categories' | 'photoUrls' | 'cardColor' | 'groupId'>>) =>
    api.patch<{ score: ScoreDetail } | null>(`/api/scores/${id}`, payload),
  remove: (id: string) => api.del(`/api/scores/${id}`),

  /** Your own score on a note, created if missing. */
  rateMe: (id: string, value: number) => api.put<{ rating: Rating }>(`/api/scores/${id}/ratings/me`, { value }),
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
  list: (space: Space = 'all') => api.get<{ categories: string[] }>(`/api/categories?space=${encodeURIComponent(space)}`),
  remove: (name: string, space: Space = 'me') => api.del(`/api/categories/${encodeURIComponent(name)}?space=${encodeURIComponent(space)}`),
};

export const tagsApi = {
  list: (space: Space = 'all') => api.get<{ tags: string[] }>(`/api/tags?space=${encodeURIComponent(space)}`),
  remove: (name: string, space: Space = 'me') => api.del(`/api/tags/${encodeURIComponent(name)}?space=${encodeURIComponent(space)}`),
};

type GroupDetail = { group: { id: string; name: string; role: 'admin' | 'member' }; members: GroupMember[] };

export const groupsApi = {
  list: () => api.get<{ groups: GroupSummary[] }>('/api/groups'),
  get: (id: string) => api.get<GroupDetail>(`/api/groups/${id}`),
  create: (name: string) => api.post<{ group: GroupSummary }>('/api/groups', { name }),
  rename: (id: string, name: string) => api.patch<{ group: { id: string; name: string } }>(`/api/groups/${id}`, { name }),
  remove: (id: string, notas: 'devolver' | 'borrar') => api.del(`/api/groups/${id}?notas=${notas}`),
  leave: (id: string) => api.post<null>(`/api/groups/${id}/leave`),
  removeMember: (id: string, userId: string) => api.del(`/api/groups/${id}/members/${userId}`),
  setRole: (id: string, userId: string, role: 'admin' | 'member') => api.patch<null>(`/api/groups/${id}/members/${userId}`, { role }),
  addByEmail: (id: string, email: string) => api.post<{ message: string }>(`/api/groups/${id}/members`, { email }),
  invites: (id: string) => api.get<{ invites: GroupInvite[] }>(`/api/groups/${id}/invites`),
  createInvite: (id: string) => api.post<{ invite: GroupInvite }>(`/api/groups/${id}/invites`),
  revokeInvite: (id: string, inviteId: string) => api.del(`/api/groups/${id}/invites/${inviteId}`),
};

export const invitesApi = {
  preview: (token: string) =>
    api.get<{ group: { id: string; name: string }; alreadyMember: boolean }>(`/api/invites/${encodeURIComponent(token)}`),
  accept: (token: string) => api.post<{ group: { id: string; name: string } }>(`/api/invites/${encodeURIComponent(token)}/accept`),
};

export const adminApi = {
  stats: () => api.get<AdminStats>('/api/admin/stats'),
  users: () => api.get<{ users: AdminUser[] }>('/api/admin/users'),
  update: (id: string, patch: { isAdmin?: boolean; disabled?: boolean }) => api.patch<{ user: AdminUser }>(`/api/admin/users/${id}`, patch),
  resetPassword: (id: string) => api.post<{ password: string }>(`/api/admin/users/${id}/password`),
  logout: (id: string) => api.post<null>(`/api/admin/users/${id}/logout`),
  remove: (id: string) => api.del(`/api/admin/users/${id}`),
  /** null goes back to the server's ALLOW_REGISTRATION. */
  setRegistration: (allowRegistration: boolean | null) =>
    api.put<{ registrationOpen: boolean; registrationOverridden: boolean }>('/api/admin/settings', { allowRegistration }),
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
