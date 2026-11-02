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
  personName: string;
  isOwner: boolean;
  value: number;
  sortOrder: number;
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
