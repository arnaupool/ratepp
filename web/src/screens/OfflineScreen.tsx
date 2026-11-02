import { useAuth } from '../auth/AuthContext';
import { NETWORK_ERROR_MESSAGE } from '../api/client';
import './OfflineScreen.css';

// Shown when a saved session can't be checked because the server is
// unreachable (e.g. away from home without VPN). Never a blank screen or an
// endless spinner.
export default function OfflineScreen() {
  const { retry } = useAuth();
  return (
    <div className="center-fill">
      <p className="offline-title">{NETWORK_ERROR_MESSAGE}</p>
      <button type="button" className="btn-primary offline-retry" onClick={retry}>
        Reintentar
      </button>
    </div>
  );
}
