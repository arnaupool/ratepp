import { useCallback } from 'react';
import { useNavigate } from 'react-router';

// navigate(-1) when there is an in-app entry to go back to; otherwise (the
// page was opened directly, e.g. a reload on /ajustes) go to Principal
// instead of leaving the app.
export function useGoBack() {
  const navigate = useNavigate();
  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/', { replace: true });
  }, [navigate]);
}
