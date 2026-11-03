import { useSyncExternalStore } from 'react';

// Principal's search/filter state lives outside the screen so it survives a
// trip to Detalle and back (the native stack kept Home mounted; a web route
// change unmounts it).
export interface HomeFilters {
  /** 'all', 'me' or a group id; shared by Principal and the map. */
  space: string;
  searchInput: string;
  category: string;
  tag: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  /** Only the group notes waiting for your score. */
  pendingOnly: boolean;
}

const INITIAL: HomeFilters = { space: 'all', searchInput: '', category: 'Todas', tag: null, dateFrom: null, dateTo: null, pendingOnly: false };
let state = INITIAL;
const listeners = new Set<() => void>();

export function setHomeFilters(patch: Partial<HomeFilters>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function resetHomeFilters() {
  setHomeFilters(INITIAL);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useHomeFilters() {
  return useSyncExternalStore(subscribe, () => state);
}
