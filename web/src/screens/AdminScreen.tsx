import { useState } from 'react';
import { Navigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../api/client';
import { adminApi } from '../api/endpoints';
import type { AdminStats, AdminUser } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import ScreenHeader from '../components/ScreenHeader';
import Sheet from '../components/Sheet';
import { Spinner } from '../components/bits';
import '../components/editors/editors.css';
import './GroupsScreen.css';
import './SettingsScreen.css';
import './AdminScreen.css';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

function fmtBytes(n: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toLocaleString('es-ES', { maximumFractionDigits: i > 1 ? 1 : 0 })} ${units[i]}`;
}

const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
function fmtAgo(iso: string) {
  const s = (new Date(iso).getTime() - Date.now()) / 1000;
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [30, 'day'],
    [12, 'month'],
  ];
  let v = s;
  for (const [size, unit] of steps) {
    if (Math.abs(v) < size) return unit === 'second' ? 'ahora mismo' : rtf.format(Math.round(v), unit);
    v /= size;
  }
  return rtf.format(Math.round(v), 'year');
}

const plural = (n: number, one: string, many: string) => `${n.toLocaleString('es-ES')} ${n === 1 ? one : many}`;

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="admin-stat">
      <span className="admin-stat-label">{label}</span>
      <span className="admin-stat-value">{value}</span>
      {!!sub && <span className="admin-stat-sub">{sub}</span>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-info-row">
      <span className="admin-info-label">{label}</span>
      <span className="admin-info-value">{value}</span>
    </div>
  );
}

export default function AdminScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = !!user?.isAdmin;
  const stats = useQuery({ queryKey: ['admin-stats'], queryFn: adminApi.stats, enabled: isAdmin });
  const users = useQuery({ queryKey: ['admin-users'], queryFn: adminApi.users, enabled: isAdmin });

  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [password, setPassword] = useState<{ user: AdminUser; value: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [toDelete, setToDelete] = useState<AdminUser | null>(null);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isAdmin) return <Navigate to="/" replace />;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

  // Runs an action from a sheet: closes it, shows any error on the screen.
  const run = async (fn: () => Promise<unknown>, fallback: string) => {
    setError('');
    setBusy(true);
    try {
      await fn();
      return true;
    } catch (e) {
      setError(errorMessage(e, fallback));
      return false;
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const act = async (fn: (u: AdminUser) => Promise<unknown>, fallback: string) => {
    const u = selected;
    setSelected(null);
    if (u) await run(() => fn(u), fallback);
  };

  const setRegistration = async (value: boolean | null) => {
    await run(async () => {
      const r = await adminApi.setRegistration(value);
      queryClient.setQueryData<AdminStats>(['admin-stats'], (old) =>
        old ? { ...old, system: { ...old.system, registrationOpen: r.registrationOpen, registrationOverridden: r.registrationOverridden } } : old
      );
      queryClient.invalidateQueries({ queryKey: ['config'] });
    }, 'No se pudo cambiar el registro');
  };

  const s = stats.data;
  const list = users.data?.users ?? [];

  return (
    <div className="screen groups-screen admin-screen">
      <ScreenHeader title="Administración" />
      <div className="groups-body">
        {!!error && <p className="error-text">{error}</p>}

        <section className="groups-section">
          <span className="t-section-label">Resumen</span>
          {!s ? (
            <div className="groups-status">{stats.isError ? errorMessage(stats.error, 'No se pudieron cargar los datos') : <Spinner />}</div>
          ) : (
            <div className="admin-stats">
              <Stat
                label="Usuarios"
                value={s.users.total.toLocaleString('es-ES')}
                sub={`${plural(s.users.new30d, 'nuevo', 'nuevos')} · ${plural(s.users.active30d, 'activo', 'activos')} en 30 días${
                  s.users.disabled ? ` · ${plural(s.users.disabled, 'desactivada', 'desactivadas')}` : ''
                }`}
              />
              <Stat label="Notas" value={s.content.notes.toLocaleString('es-ES')} sub={`${s.content.groupNotes.toLocaleString('es-ES')} en grupos`} />
              <Stat label="Grupos" value={s.content.groups.toLocaleString('es-ES')} />
              <Stat label="Fotos" value={s.content.photos.toLocaleString('es-ES')} sub={`${plural(s.storage.photoFiles, 'archivo', 'archivos')} en disco`} />
              <Stat label="Espacio de fotos" value={fmtBytes(s.storage.photoBytes)} sub={`+ ${fmtBytes(s.storage.thumbBytes)} de miniaturas`} />
              <Stat label="Base de datos" value={fmtBytes(s.storage.dbBytes)} />
            </div>
          )}
        </section>

        {s && (
          <section className="groups-section">
            <span className="t-section-label">Registro</span>
            <label className="settings-row admin-row">
              <span className="settings-row-label">Registro abierto</span>
              <input
                type="checkbox"
                role="switch"
                className="switch"
                checked={s.system.registrationOpen}
                disabled={busy}
                onChange={(e) => setRegistration(e.target.checked)}
                aria-label="Registro abierto"
              />
            </label>
            <span className="groups-item-meta">
              {s.system.registrationOverridden
                ? `Cambiado desde el panel. En el servidor (ALLOW_REGISTRATION) está ${s.system.registrationDefault ? 'abierto' : 'cerrado'}.`
                : 'Sigue el valor del servidor (ALLOW_REGISTRATION).'}
              {s.system.adminEmail ? ` ${s.system.adminEmail} puede registrarse siempre.` : ''}
            </span>
            {s.system.registrationOverridden && (
              <button type="button" className="select-chip admin-chip-start" onClick={() => setRegistration(null)} disabled={busy}>
                Volver al valor del servidor
              </button>
            )}
          </section>
        )}

        <section className="groups-section">
          <span className="t-section-label">Usuarios</span>
          {users.isPending ? (
            <div className="groups-status">
              <Spinner />
            </div>
          ) : (
            <div className="groups-list">
              {list.map((u) => {
                const locked = u.isMe || u.isProtected;
                return (
                  <button
                    key={u.id}
                    type="button"
                    className={`groups-member admin-user${u.disabled ? ' disabled' : ''}`}
                    onClick={() => !locked && setSelected(u)}
                    disabled={locked}
                    aria-label={`${u.name}, ${u.email}`}
                  >
                    <span className="groups-member-text">
                      <span className="groups-item-name">
                        {u.name}
                        {u.isMe ? ' (tú)' : ''}
                      </span>
                      <span className="groups-item-meta">{u.email}</span>
                      <span className="groups-item-meta">
                        Alta {fmtDate(u.createdAt)} · {u.lastSeenAt ? `visto ${fmtAgo(u.lastSeenAt)}` : 'nunca visto'} · {plural(u.notes, 'nota', 'notas')} ·{' '}
                        {plural(u.groups, 'grupo', 'grupos')}
                      </span>
                    </span>
                    <span className="admin-badges">
                      {u.isAdmin && <span className="groups-role">Admin</span>}
                      {u.isProtected && <span className="admin-badge">ADMIN_EMAIL</span>}
                      {u.disabled && <span className="admin-badge warn">Desactivada</span>}
                    </span>
                    {!locked && <span className="groups-item-chevron">›</span>}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {s && (
          <section className="groups-section">
            <span className="t-section-label">Sistema</span>
            <div className="admin-info">
              <InfoRow label="Versión" value={s.system.version ? s.system.version.slice(0, 7) : 'Sin datos (imagen local)'} />
              <InfoRow label="Encendido" value={`${fmtAgo(s.system.startedAt)} (${new Date(s.system.startedAt).toLocaleString('es-ES')})`} />
              <InfoRow label="Node" value={s.system.nodeVersion} />
              <InfoRow label="Dirección externa" value={s.system.publicUrl ?? 'Sin configurar'} />
              <InfoRow label="ADMIN_EMAIL" value={s.system.adminEmail ?? 'Sin configurar'} />
              <InfoRow label="Carátulas de pelis y series (TMDB)" value={s.system.tmdb ? 'Configurada' : 'Sin clave'} />
              <InfoRow label="Carátulas de videojuegos (RAWG)" value={s.system.rawg ? 'Configurada' : 'Sin clave'} />
            </div>
          </section>
        )}
      </div>

      <Sheet visible={!!selected} onClose={() => setSelected(null)} label="Acciones de la cuenta">
        {selected && (
          <>
            <h2 className="sheet-title">{selected.name}</h2>
            <p className="sheet-message">{selected.email}</p>
            <div className="admin-actions">
              <button
                type="button"
                className="admin-action"
                onClick={() => act((u) => adminApi.update(u.id, { isAdmin: !u.isAdmin }), 'No se pudo cambiar el permiso')}
              >
                {selected.isAdmin ? 'Quitar admin' : 'Hacer admin'}
              </button>
              <button
                type="button"
                className="admin-action"
                onClick={() => act((u) => adminApi.update(u.id, { disabled: !u.disabled }), 'No se pudo cambiar la cuenta')}
              >
                {selected.disabled ? 'Reactivar cuenta' : 'Desactivar cuenta'}
              </button>
              <button
                type="button"
                className="admin-action"
                onClick={() =>
                  act(async (u) => {
                    const r = await adminApi.resetPassword(u.id);
                    setCopied(false);
                    setPassword({ user: u, value: r.password });
                  }, 'No se pudo restablecer la contraseña')
                }
              >
                Restablecer contraseña
              </button>
              <button type="button" className="admin-action" onClick={() => act((u) => adminApi.logout(u.id), 'No se pudieron cerrar las sesiones')}>
                Cerrar todas sus sesiones
              </button>
              <button
                type="button"
                className="sheet-btn-main danger"
                onClick={() => {
                  setToDelete(selected);
                  setDeleteEmail('');
                  setSelected(null);
                }}
              >
                Eliminar cuenta
              </button>
              <button type="button" className="sheet-btn-text" onClick={() => setSelected(null)}>
                Cancelar
              </button>
            </div>
          </>
        )}
      </Sheet>

      <Sheet visible={!!password} onClose={() => setPassword(null)} label="Contraseña temporal">
        {password && (
          <>
            <h2 className="sheet-title">Contraseña temporal</h2>
            <p className="sheet-message">
              Pásasela a {password.user.name}. Solo se muestra ahora; sus sesiones abiertas se han cerrado.
            </p>
            <input className="editor-input admin-password" readOnly value={password.value} aria-label="Contraseña temporal" onFocus={(e) => e.target.select()} />
            <div className="sheet-actions">
              <button
                type="button"
                className="sheet-btn-text"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(password.value);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                {copied ? 'Copiada' : 'Copiar'}
              </button>
              <button type="button" className="sheet-btn-main" onClick={() => setPassword(null)}>
                Hecho
              </button>
            </div>
          </>
        )}
      </Sheet>

      <Sheet visible={!!toDelete} onClose={() => setToDelete(null)} label="Eliminar cuenta">
        {toDelete && (
          <form
            className="admin-delete"
            onSubmit={async (e) => {
              e.preventDefault();
              const u = toDelete;
              if (deleteEmail.trim().toLowerCase() !== u.email) return;
              setToDelete(null);
              await run(() => adminApi.remove(u.id), 'No se pudo eliminar la cuenta');
            }}
          >
            <h2 className="sheet-title">¿Eliminar la cuenta de {toDelete.name}?</h2>
            <p className="sheet-message">
              Se borran sus notas personales y sus fotos. Sus notas y puntuaciones en grupos se quedan como de un antiguo miembro. No se puede deshacer.
            </p>
            <input
              className="editor-input"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              placeholder={toDelete.email}
              value={deleteEmail}
              onChange={(e) => setDeleteEmail(e.target.value)}
              aria-label="Escribe su email para confirmar"
            />
            <span className="groups-item-meta">Escribe su email para confirmar.</span>
            <div className="sheet-actions">
              <button type="button" className="sheet-btn-text" onClick={() => setToDelete(null)}>
                Cancelar
              </button>
              <button type="submit" className="sheet-btn-main danger" disabled={deleteEmail.trim().toLowerCase() !== toDelete.email}>
                Eliminar
              </button>
            </div>
          </form>
        )}
      </Sheet>
    </div>
  );
}
