import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { scoresApi } from '../api/endpoints';
import ScreenHeader from '../components/ScreenHeader';
import { Spinner } from '../components/bits';
import './LocationsMapScreen.css';

const LocationsMap = lazy(() => import('../components/map/LocationsMap'));

export default function LocationsMapScreen() {
  const navigate = useNavigate();
  const { data, isPending, isError } = useQuery({ queryKey: ['locations'], queryFn: scoresApi.locations });
  const pins = data?.locations ?? [];

  return (
    <div className="screen locations-screen">
      <ScreenHeader title="Mapa de ubicaciones" />
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
