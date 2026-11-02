import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../theme/ThemeContext';
import './SettingsScreen.css';

export default function SettingsScreen() {
  const { dark, setDark } = useTheme();
  return (
    <div className="screen">
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
    </div>
  );
}
