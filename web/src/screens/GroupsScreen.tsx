import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../api/client';
import { groupsApi } from '../api/endpoints';
import ScreenHeader from '../components/ScreenHeader';
import { Spinner } from '../components/bits';
import '../components/editors/editors.css';
import './GroupsScreen.css';

// Your groups, and a field to create one (you become its admin).
export default function GroupsScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isPending, isError } = useQuery({ queryKey: ['groups'], queryFn: groupsApi.list });
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    setCreating(true);
    try {
      const { group } = await groupsApi.create(name.trim());
      setName('');
      await queryClient.invalidateQueries({ queryKey: ['groups'] });
      navigate(`/grupos/${group.id}`);
    } catch (err) {
      setError(errorMessage(err, 'No se pudo crear el grupo'));
    } finally {
      setCreating(false);
    }
  };

  const groups = data?.groups ?? [];

  return (
    <div className="screen groups-screen">
      <ScreenHeader title="Grupos" />
      <div className="groups-body">
        <p className="groups-intro">Comparte notas y etiquetas con otras personas: todos los miembros ven, crean y puntúan las notas del grupo.</p>

        <form className="groups-create" onSubmit={create}>
          <input className="editor-input" placeholder="Nombre del grupo nuevo" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-label="Nombre del grupo nuevo" />
          <button type="submit" className="btn-primary groups-create-btn" disabled={creating || !name.trim()}>
            {creating ? <Spinner small onAccent label="Creando" /> : 'Crear'}
          </button>
        </form>
        {!!error && <p className="error-text">{error}</p>}

        {isPending ? (
          <div className="groups-status">
            <Spinner />
          </div>
        ) : isError ? (
          <p className="groups-status">No se pudieron cargar tus grupos</p>
        ) : groups.length === 0 ? (
          <p className="groups-status">Todavía no estás en ningún grupo.</p>
        ) : (
          <div className="groups-list">
            {groups.map((g) => (
              <button type="button" key={g.id} className="groups-item" onClick={() => navigate(`/grupos/${g.id}`)} aria-label={`Abrir grupo ${g.name}`}>
                <span className="groups-item-name">👥 {g.name}</span>
                <span className="groups-item-meta">
                  {g.memberCount} {g.memberCount === 1 ? 'miembro' : 'miembros'}
                  {g.role === 'admin' ? ' · admin' : ''}
                </span>
                <span className="groups-item-chevron" aria-hidden="true">
                  ›
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
