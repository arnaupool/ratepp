export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface AppConfig {
  allowRegistration: boolean;
  mapTileUrl: string;
}

export interface Rating {
  id: string;
  /** The account's name for ratings made with one; the typed name otherwise. */
  personName: string;
  /** The author's own rating. */
  isOwner: boolean;
  value: number;
  sortOrder: number;
  /** Set for ratings made with an account; null for "Nota adicional" ones. */
  userId: string | null;
  isMe: boolean;
  /** The rater has left the note's group. */
  formerMember: boolean;
}

export interface GroupSummary {
  id: string;
  name: string;
  role: 'admin' | 'member';
  memberCount: number;
}

export interface GroupMember {
  userId: string;
  name: string;
  email?: string;
  role: 'admin' | 'member';
  isMe: boolean;
}

export interface GroupInvite {
  id: string;
  expiresAt: string;
  createdAt?: string;
  token?: string;
  path?: string;
}

export type FieldType =
  | 'text_long'
  | 'number'
  | 'date'
  | 'location'
  | 'photo'
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

export interface LocationValue {
  label: string;
  lat: number | null;
  lng: number | null;
}

export interface Field {
  id: string;
  type: FieldType;
  label: string;
  // Shape depends on type (doc 01); legacy rows may not match, so readers
  // must tolerate anything.
  value: unknown;
  sortOrder: number;
}

export interface ScoreSummary {
  id: string;
  title: string;
  categories: string[];
  photoUrls: string[];
  cardColor: string | null;
  createdAt: string;
  updatedAt: string;
  /** null = personal note. */
  groupId: string | null;
  groupName: string | null;
  authorId: string;
  authorName: string | null;
  /** May delete it or move it to another space (author or group admin). */
  canManage: boolean;
  ratings: Rating[];
}

export interface ScoreDetail extends ScoreSummary {
  fields: Field[];
}

export interface LocationPin {
  scoreId: string;
  title: string;
  coverUrl: string | null;
  avgScore: number | null;
  label: string | null;
  lat: number;
  lng: number;
}
