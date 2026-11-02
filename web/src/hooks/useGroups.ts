import { useQuery } from '@tanstack/react-query';
import { groupsApi } from '../api/endpoints';

/** The groups the user belongs to (empty while loading). */
export function useGroups() {
  const q = useQuery({ queryKey: ['groups'], queryFn: groupsApi.list });
  return q.data?.groups ?? [];
}
