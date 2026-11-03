import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { errorMessage } from '../api/client';
import { accountApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import ScreenHeader from '../components/ScreenHeader';
import Sheet from '../components/Sheet';
import { Spinner } from '../components/bits';
import { useTheme } from '../theme/ThemeContext';
import '../components/editors/editors.css';
import './SettingsScreen.css';

type Panel = 'email' | 'password' | 'delete' | null;

// A sheet with a form: title, inputs, the server's error and its buttons.
function FormSheet({
  visible,
  title,
  message,
  submitLabel,
  danger = false,
  busy,
  error,
  onSubmit,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  message?: string;
  submitLabel: string;
  danger?: boolean;
  busy: boolean;
  error: string;
  onSubmit: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} label={title}>
      <form
        className="settings-form"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <h2 className="sheet-title">{title}</h2>
        {!!message && <p className="sheet-message">{message}</p>}
        {children}
        {!!error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="sheet-actions">
          <button type="button" className="sheet-btn-text" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className={`sheet-btn-main${danger ? ' danger' : ''}`} disabled={busy}>
            {busy ? <Spinner small onAccent label="Guardando" /> : submitLabel}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

export default function SettingsScreen() {
  const { dark, setDark } = useTheme();
  const { user, updateSession, logout } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [panel, setPanel] = useState<Panel>(null);
  const [panelError, setPanelError] = useState('');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => setName(user?.name ?? ''), [user?.name]);

  const open = (p: Panel) => {
    setPanel(p);
    setPanelError('');
    setNotice('');
    setEmail(p === 'email' ? (user?.email ?? '') : '');
    setPassword('');
    setNewPassword('');
    setRepeat('');
  };

  // Runs a sheet's request; on success closes it and shows the notice.
  const submit = async (fn: () => Promise<unknown>, done: string, fallback: string) => {
    setPanelError('');
    setBusy(true);
    try {
      await fn();
      setPanel(null);
      setNotice(done);
    } catch (e) {
      setPanelError(errorMessage(e, fallback));
    } finally {
      setBusy(false);
    }
  };

  const saveName = async () => {
    const clean = name.trim();
    if (!user || clean === user.name) return setName(user?.name ?? '');
    if (!clean) {
      setName(user.name);
      return setError('El nombre no puede estar vacío');
    }
    setError('');
    try {
      const r = await accountApi.rename(clean);
      updateSession({ user: { ...user, ...r.user } });
      setNotice('Nombre guardado');
    } catch (e) {
      setError(errorMessage(e, 'No se pudo cambiar el nombre'));
    }
  };

  const isProtected = !!user?.isProtected;

  return (
    <div className="screen settings-screen">
      <ScreenHeader title="Ajustes" />

      <span className="t-section-label settings-section">Apariencia</span>
      <label className="settings-row">
        <span className="settings-row-label">Modo oscuro</span>
        <input
          type="checkbox"
          role="switch"
          className="switch"
          checked={dark}
          onChange={(e) => setDark(e.target.checked)}
          aria-label="Modo oscuro"
        />
      </label>

      <span className="t-section-label settings-section">Cuenta</span>
      {!!notice && <p className="settings-notice">{notice}</p>}
      {!!error && <p className="error-text settings-error">{error}</p>}

      <label className="settings-row settings-info">
        <span className="settings-row-hint">Nombre</span>
        <input
          className="editor-input settings-input"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          enterKeyHint="done"
          aria-label="Nombre"
        />
        <span className="settings-row-hint">Es el que ven los demás en los grupos.</span>
      </label>

      <div className="settings-row">
        <span className="settings-row-text">
          <span className="settings-row-hint">Email</span>
          <span className="settings-row-value">{user?.email}</span>
          {isProtected && <span className="settings-row-hint">Es la cuenta de ADMIN_EMAIL: el email se cambia en el servidor.</span>}
        </span>
        {!isProtected && (
          <button type="button" className="select-chip" onClick={() => open('email')}>
            Cambiar
          </button>
        )}
      </div>

      <div className="settings-row">
        <span className="settings-row-text">
          <span className="settings-row-hint">Contraseña</span>
          <span className="settings-row-value">••••••••</span>
        </span>
        <button type="button" className="select-chip" onClick={() => open('password')}>
          Cambiar
        </button>
      </div>

      <button type="button" className="settings-row settings-action" onClick={() => setConfirmLogout(true)}>
        Cerrar sesión en los demás dispositivos
      </button>

      {isProtected ? (
        <p className="settings-row-hint settings-footnote">La cuenta de ADMIN_EMAIL no se puede borrar desde Ajustes.</p>
      ) : (
        <button type="button" className="settings-row settings-action danger" onClick={() => open('delete')}>
          Borrar mi cuenta
        </button>
      )}

      <FormSheet
        visible={panel === 'email'}
        title="Cambiar email"
        message="Es con el que inicias sesión."
        submitLabel="Guardar"
        busy={busy}
        error={panelError}
        onClose={() => setPanel(null)}
        onSubmit={() =>
          submit(
            async () => {
              const r = await accountApi.changeEmail(email.trim(), password);
              if (user) updateSession({ user: { ...user, ...r.user } });
            },
            'Email cambiado',
            'No se pudo cambiar el email'
          )
        }
      >
        <input
          className="editor-input"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email nuevo"
        />
        <input
          className="editor-input"
          type="password"
          autoComplete="current-password"
          placeholder="Tu contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-label="Contraseña actual"
        />
      </FormSheet>

      <FormSheet
        visible={panel === 'password'}
        title="Cambiar contraseña"
        message="Se cerrará la sesión en tus otros dispositivos."
        submitLabel="Guardar"
        busy={busy}
        error={panelError}
        onClose={() => setPanel(null)}
        onSubmit={() => {
          if (newPassword !== repeat) return setPanelError('Las contraseñas no coinciden');
          if (newPassword.length < 6) return setPanelError('La contraseña debe tener al menos 6 caracteres');
          submit(
            async () => updateSession({ token: (await accountApi.changePassword(password, newPassword)).token }),
            'Contraseña cambiada',
            'No se pudo cambiar la contraseña'
          );
        }}
      >
        <input
          className="editor-input"
          type="password"
          autoComplete="current-password"
          placeholder="Contraseña actual"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-label="Contraseña actual"
        />
        <input
          className="editor-input"
          type="password"
          autoComplete="new-password"
          placeholder="Contraseña nueva"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          aria-label="Contraseña nueva"
        />
        <input
          className="editor-input"
          type="password"
          autoComplete="new-password"
          placeholder="Repite la contraseña nueva"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          aria-label="Repite la contraseña nueva"
        />
      </FormSheet>

      <FormSheet
        visible={panel === 'delete'}
        title="¿Borrar tu cuenta?"
        message="Se borran tus notas personales, sus fotos y tus plantillas. Tus notas y puntuaciones en grupos se quedan como de un antiguo miembro. No se puede deshacer."
        submitLabel="Borrar cuenta"
        danger
        busy={busy}
        error={panelError}
        onClose={() => setPanel(null)}
        onSubmit={async () => {
          setPanelError('');
          setBusy(true);
          try {
            await accountApi.remove(password);
            setPanel(null);
            logout();
          } catch (e) {
            setPanelError(errorMessage(e, 'No se pudo borrar la cuenta'));
          } finally {
            setBusy(false);
          }
        }}
      >
        <input
          className="editor-input"
          type="password"
          autoComplete="current-password"
          placeholder="Tu contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-label="Contraseña actual"
        />
      </FormSheet>

      <ConfirmDialog
        visible={confirmLogout}
        title="¿Cerrar las demás sesiones?"
        message="Tendrás que volver a iniciar sesión en tus otros dispositivos. Este sigue abierto."
        confirmLabel="Cerrar sesiones"
        onConfirm={async () => {
          setConfirmLogout(false);
          setError('');
          try {
            updateSession({ token: (await accountApi.logoutOthers()).token });
            setNotice('Sesiones cerradas en los demás dispositivos');
          } catch (e) {
            setError(errorMessage(e, 'No se pudieron cerrar las sesiones'));
          }
        }}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  );
}
