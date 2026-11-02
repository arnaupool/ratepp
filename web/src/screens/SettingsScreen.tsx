import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { AppConfig } from '../api/types';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../theme/ThemeContext';
import './SettingsScreen.css';

export default function SettingsScreen() {
  const { dark, setDark } = useTheme();
  const { data: config } = useQuery({ queryKey: ['config'], queryFn: () => api.get<AppConfig>('/api/config'), staleTime: Infinity });
  return (
    <div className="screen settings-screen">
      <ScreenHeader title="Ajustes" />
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

      {/* Set by the server (PUBLIC_URL in the container); shown so it can be checked. */}
      {config && (
        <div className="settings-row settings-info">
          <span className="settings-row-label">Dirección externa</span>
          <span className="settings-row-value">{config.publicUrl ?? 'Sin configurar: las invitaciones usan la dirección con la que abres la app.'}</span>
          <span className="settings-row-hint">Se configura en el servidor con la variable PUBLIC_URL.</span>
        </div>
      )}
    </div>
  );
}
