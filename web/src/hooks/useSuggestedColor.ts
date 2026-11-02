import { useQuery } from '@tanstack/react-query';
import { colorsApi } from '../api/endpoints';
import { normalizeImageUrl } from '../utils/images';

// Average color of the cover photo, offered as a card-color suggestion.
// Best effort: any failure just means no suggestion.
export function useSuggestedColor(coverUrl: string | null | undefined) {
  const url = normalizeImageUrl(coverUrl);
  const { data } = useQuery({
    queryKey: ['color', url],
    queryFn: () => colorsApi.dominant(url!).then((r) => r.color),
    enabled: !!url,
    staleTime: Infinity,
  });
  return url ? (data ?? null) : null;
}
