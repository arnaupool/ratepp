import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../api/client';
import { groupsApi } from '../api/endpoints';
import type { GroupInvite, GroupMember } from '../api/types';
import ConfirmDialog from '../components/ConfirmDialog';
import ScreenHeader from '../components/ScreenHeader';
import Sheet from '../components/Sheet';
import { Spinner } from '../components/bits';
import { setHomeFilters, useHomeFilters } from '../state/homeFilters';
import '../components/editors/editors.css';
import './GroupsScreen.css';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

export default function GroupDetailScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const homeSpace = useHomeFilters().space;
  const detail = useQuery({ queryKey: ['group', id], queryFn: () => groupsApi.get(id) });
  const isAdmin = detail.data?.group.role === 'admin';
  const invites = useQuery({ queryKey: ['group-invites', id], queryFn: () => groupsApi.invites(id), enabled: isAdmin });

  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [newInvite, setNewInvite] = useState<GroupInvite | null>(null);
  const [email, setEmail] = useState('');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<GroupMember | null>(null);
  const [removeName, setRemoveName] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (detail.data) setName(detail.data.group.name);
  }, [detail.data]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['group', id] });
    queryClient.invalidateQueries({ queryKey: ['groups'] });
  };

  // Something that changes what notes you can see.
  const refreshNotes = () => {
    for (const key of ['scores', 'score', 'categories', 'tags', 'locations']) queryClient.invalidateQueries({ queryKey: [key] });
  };

  const run = async (fn: () => Promise<unknown>, fallback: string) => {
    setError('');
    setNotice('');
    try {
      await fn();
      return true;
    } catch (e) {
      setError(errorMessage(e, fallback));
      return false;
    }
  };

  const rename = async () => {
    const clean = name.trim();
    if (!detail.data || !clean || clean === detail.data.group.name) return setName(detail.data?.group.name ?? '');
    if (await run(() => groupsApi.rename(id, clean), 'No se pudo cambiar el nombre')) refresh();
  };

  const createInvite = async () => {
    await run(async () => {
      const { invite } = await groupsApi.createInvite(id);
      setNewInvite(invite);
      queryClient.invalidateQueries({ queryKey: ['group-invites', id] });
    }, 'No se pudo crear la invitación');
  };

  const inviteUrl = newInvite?.path ? `${window.location.origin}${newInvite.path}` : '';

  const shareInvite = async () => {
    const text = `Únete a "${detail.data?.group.name}" en Puntuaciones`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Puntuaciones', text, url: inviteUrl });
        return;
      } catch {
        // cancelled: fall back to copying
      }
    }
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setNotice('Enlace copiado');
    } catch {
      setNotice('Copia el enlace a mano');
    }
  };

  const addByEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await run(async () => {
      const { message } = await groupsApi.addByEmail(id, email.trim());
      setEmail('');
      setNotice(message);
      refresh();
    }, 'No se pudo añadir');
  };

  const leave = async () => {
    setConfirmLeave(false);
    if (await run(() => groupsApi.leave(id), 'No se pudo salir del grupo')) {
      if (homeSpace === id) setHomeFilters({ space: 'all', category: 'Todas', tag: null });
      refresh();
      refreshNotes();
      navigate('/grupos', { replace: true });
    }
  };

  const remove = async (notas: 'devolver' | 'borrar') => {
    setDeleteOpen(false);
    if (await run(() => groupsApi.remove(id, notas), 'No se pudo borrar el grupo')) {
      if (homeSpace === id) setHomeFilters({ space: 'all', category: 'Todas', tag: null });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      refreshNotes();
      navigate('/grupos', { replace: true });
    }
  };

  if (detail.isPending) {
    return (
      <div className="screen">
        <ScreenHeader title="Grupo" />
        <div className="groups-status">
          <Spinner />
        </div>
      </div>
    );
  }
  if (!detail.data) {
    return (
      <div className="screen">
        <ScreenHeader title="Grupo" />
        <p className="groups-status">{errorMessage(detail.error, 'No se pudo cargar el grupo')}</p>
      </div>
    );
  }

  const { members } = detail.data;
  const activeInvites = invites.data?.invites ?? [];

  return (
    <div className="screen groups-screen">
      <ScreenHeader title={detail.data.group.name} />
      <div className="groups-body">
        {isAdmin && (
          <label className="groups-field">
            <span className="t-section-label">Nombre</span>
            <input className="editor-input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} onBlur={rename} aria-label="Nombre del grupo" />
          </label>
        )}

        {!!error && <p className="error-text">{error}</p>}
        {!!notice && <p className="groups-notice">{notice}</p>}

        <section className="groups-section">
          <span className="t-section-label">Miembros</span>
          <div className="groups-list">
            {members.map((m) => (
              <div key={m.userId} className="groups-member">
                <span className="groups-member-text">
                  <span className="groups-item-name">
                    {m.name}
                    {m.isMe ? ' (tú)' : ''}
                  </span>
                  {m.email && <span className="groups-item-meta">{m.email}</span>}
                </span>
                {m.role === 'admin' && <span className="groups-role">Admin</span>}
                {isAdmin && !m.isMe && (
                  <span className="groups-member-actions">
                    <button
                      type="button"
                      className="select-chip"
                      onClick={async () => {
                        if (await run(() => groupsApi.setRole(id, m.userId, m.role === 'admin' ? 'member' : 'admin'), 'No se pudo cambiar el rol')) refresh();
                      }}
                    >
                      {m.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                    </button>
                    <button
                      type="button"
                      className="select-chip danger"
                      onClick={() => {
                        setConfirmRemove(m);
                        setRemoveName(m.name);
                      }}
                      aria-label={`Expulsar a ${m.name}`}
                    >
                      Expulsar
                    </button>
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {isAdmin && (
          <section className="groups-section">
            <span className="t-section-label">Invitar</span>
            <button type="button" className="btn-primary" onClick={createInvite}>
              Crear enlace de invitación
            </button>
            {newInvite && (
              <div className="groups-invite">
                <input className="editor-input" readOnly value={inviteUrl} aria-label="Enlace de invitación" onFocus={(e) => e.target.select()} />
                <button type="button" className="select-chip on" onClick={shareInvite}>
                  Compartir
                </button>
                <span className="groups-item-meta">Caduca el {fmtDate(newInvite.expiresAt)}. Quien lo abra con su cuenta entrará en el grupo.</span>
              </div>
            )}
            {activeInvites.length > 0 && (
              <div className="groups-list">
                {activeInvites.map((inv) => (
                  <div key={inv.id} className="groups-member">
                    <span className="groups-member-text">
                      <span className="groups-item-meta">Enlace activo · caduca el {fmtDate(inv.expiresAt)}</span>
                    </span>
                    <button
                      type="button"
                      className="select-chip"
                      onClick={async () => {
                        if (await run(() => groupsApi.revokeInvite(id, inv.id), 'No se pudo anular')) {
                          if (newInvite?.id === inv.id) setNewInvite(null);
                          queryClient.invalidateQueries({ queryKey: ['group-invites', id] });
                        }
                      }}
                    >
                      Anular
                    </button>
                  </div>
                ))}
              </div>
            )}
            <form className="groups-create" onSubmit={addByEmail}>
              <input
                className="editor-input"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                placeholder="Añadir por email (ya con cuenta)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email de la persona"
              />
              <button type="submit" className="btn-primary groups-create-btn" disabled={!email.trim()}>
                Añadir
              </button>
            </form>
          </section>
        )}

        <section className="groups-section groups-danger">
          <button type="button" className="sheet-btn-outline" onClick={() => setConfirmLeave(true)}>
            Salir del grupo
          </button>
          {isAdmin && (
            <button type="button" className="sheet-btn-main danger" onClick={() => setDeleteOpen(true)}>
              Borrar grupo
            </button>
          )}
        </section>
      </div>

      <ConfirmDialog
        visible={confirmLeave}
        title="¿Salir del grupo?"
        message="Las notas que creaste aquí se quedan en el grupo y tus puntuaciones se conservan. Dejarás de verlas."
        confirmLabel="Salir"
        onConfirm={leave}
        onCancel={() => setConfirmLeave(false)}
      />

      <ConfirmDialog
        visible={!!confirmRemove}
        title={`¿Expulsar a ${removeName}?`}
        message="Sus notas se quedan en el grupo y sus puntuaciones se conservan. Dejará de verlas."
        confirmLabel="Expulsar"
        onConfirm={async () => {
          const m = confirmRemove;
          setConfirmRemove(null);
          if (m && (await run(() => groupsApi.removeMember(id, m.userId), 'No se pudo expulsar'))) refresh();
        }}
        onCancel={() => setConfirmRemove(null)}
      />

      <Sheet visible={deleteOpen} onClose={() => setDeleteOpen(false)} label="Borrar grupo">
        <h2 className="sheet-title">¿Borrar el grupo?</h2>
        <p className="sheet-message">Elige qué pasa con sus notas. No se puede deshacer.</p>
        <button type="button" className="btn-primary" onClick={() => remove('devolver')}>
          Devolver las notas a sus autores
        </button>
        <button type="button" className="sheet-btn-main danger groups-delete-all" onClick={() => remove('borrar')}>
          Borrar también las notas
        </button>
        <button type="button" className="sheet-btn-text" onClick={() => setDeleteOpen(false)}>
          Cancelar
        </button>
      </Sheet>
    </div>
  );
}
