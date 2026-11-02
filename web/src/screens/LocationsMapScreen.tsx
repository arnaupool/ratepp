import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { scoresApi } from '../api/endpoints';
import ScreenHeader from '../components/ScreenHeader';
import SpaceRow from '../components/SpaceRow';
import '../components/SpaceRow.css';
import { Spinner } from '../components/bits';
import { useGroups } from '../hooks/useGroups';
import { setHomeFilters, useHomeFilters } from '../state/homeFilters';
import './LocationsMapScreen.css';

const LocationsMap = lazy(() => import('../components/map/LocationsMap'));

export default function LocationsMapScreen() {
  const navigate = useNavigate();
  // Same space selector as Principal (and the same choice).
  const { space } = useHomeFilters();
  const groups = useGroups();
  const { data, isPending, isError } = useQuery({ queryKey: ['locations', space], queryFn: () => scoresApi.locations(space) });
  const pins = data?.locations ?? [];

  return (
    <div className="screen locations-screen">
      <ScreenHeader title="Mapa de ubicaciones" />
      <SpaceRow groups={groups} value={space} withAll onChange={(s) => setHomeFilters({ space: s, category: 'Todas', tag: null })} />
      {isPending ? (
        <div className="locations-status">
          <Spinner />
        </div>
      ) : isError ? (
        <p className="locations-status">No se pudieron cargar las ubicaciones</p>
      ) : (
        <div className="locations-map-wrap">
          <Suspense fallback={null}>
            <LocationsMap pins={pins} onOpen={(id) => navigate(`/p/${id}`)} />
          </Suspense>
          {pins.length === 0 && <p className="locations-empty">Todavía no has guardado ninguna ubicación en tus puntuaciones.</p>}
        </div>
      )}
    </div>
  );
}
