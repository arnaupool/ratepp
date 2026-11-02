import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../api/client';
import { invitesApi } from '../api/endpoints';
import ScreenHeader from '../components/ScreenHeader';
import { Spinner } from '../components/bits';
import '../components/editors/editors.css';
import './GroupsScreen.css';

// Opened from an invitation link (/unirse/:token). Signed-out visitors log
// in first and come back here.
export default function JoinGroupScreen() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const preview = useQuery({ queryKey: ['invite', token], queryFn: () => invitesApi.preview(token), retry: false });
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const join = async () => {
    setJoining(true);
    setError('');
    try {
      const { group } = await invitesApi.accept(token);
      await queryClient.invalidateQueries({ queryKey: ['groups'] });
      for (const key of ['scores', 'categories', 'tags', 'locations']) queryClient.invalidateQueries({ queryKey: [key] });
      navigate(`/grupos/${group.id}`, { replace: true });
    } catch (e) {
      setError(errorMessage(e, 'No se pudo unir al grupo'));
      setJoining(false);
    }
  };

  return (
    <div className="screen groups-screen">
      <ScreenHeader title="Invitación" />
      <div className="groups-body">
        {preview.isPending ? (
          <div className="groups-status">
            <Spinner />
          </div>
        ) : !preview.data ? (
          <>
            <p className="groups-status">{errorMessage(preview.error, 'La invitación no existe o ha caducado')}</p>
            <button type="button" className="btn-primary" onClick={() => navigate('/', { replace: true })}>
              Ir a tus puntuaciones
            </button>
          </>
        ) : preview.data.alreadyMember ? (
          <>
            <p className="groups-join-title">Ya estás en 👥 {preview.data.group.name}</p>
            <button type="button" className="btn-primary" onClick={() => navigate(`/grupos/${preview.data!.group.id}`, { replace: true })}>
              Ver grupo
            </button>
          </>
        ) : (
          <>
            <p className="groups-join-title">Te han invitado a 👥 {preview.data.group.name}</p>
            <p className="groups-intro">Verás las notas del grupo, podrás crear nuevas y puntuarlas con tu cuenta.</p>
            {!!error && <p className="error-text">{error}</p>}
            <button type="button" className="btn-primary" onClick={join} disabled={joining}>
              {joining ? <Spinner small onAccent label="Uniéndote" /> : 'Unirme al grupo'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
