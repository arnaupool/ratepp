import { useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { usePresence } from '../hooks/usePresence';
import './SideMenu.css';

// Panel and scrim share one duration and curve (240ms in, 180ms out) so
// they read as a single movement.
export default function SideMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { mounted, shown } = usePresence(visible, 180);
  if (!mounted) return null;

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <div className={`side-menu${shown ? ' shown' : ''}`}>
      <div className="side-menu-scrim" onClick={onClose} />
      <nav className="side-menu-panel" aria-label="Menú">
        <div className="side-menu-name">{user?.name || 'Puntuaciones'}</div>
        {!!user?.email && <div className="side-menu-email">{user.email}</div>}
        <div className="side-menu-items">
          <button className="side-menu-item" onClick={() => go('/mapa')}>
            🗺️&nbsp;&nbsp;Mapa de ubicaciones
          </button>
          <button className="side-menu-item" onClick={() => go('/grupos')}>
            👥&nbsp;&nbsp;Grupos
          </button>
          <button className="side-menu-item" onClick={() => go('/etiquetas')}>
            🏷️&nbsp;&nbsp;Categorías y etiquetas
          </button>
          <button className="side-menu-item" onClick={() => go('/ajustes')}>
            ⚙️&nbsp;&nbsp;Ajustes
          </button>
          {user?.isAdmin && (
            <button className="side-menu-item" onClick={() => go('/admin')}>
              🛡️&nbsp;&nbsp;Administración
            </button>
          )}
          <button
            className="side-menu-item sub"
            onClick={() => {
              onClose();
              logout();
            }}
          >
            ↩️&nbsp;&nbsp;Cerrar sesión
          </button>
        </div>
      </nav>
    </div>
  );
}
