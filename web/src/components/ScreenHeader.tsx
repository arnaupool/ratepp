import { useGoBack } from '../hooks/useGoBack';
import './ScreenHeader.css';

export function BackButton({ onClick }: { onClick?: () => void }) {
  const goBack = useGoBack();
  return (
    <button type="button" className="back-btn" onClick={onClick ?? goBack} aria-label="Volver">
      <span className="back-arrow" />
    </button>
  );
}

// Back button + screen title, as in Ajustes / Mapa / Categorías y etiquetas.
export default function ScreenHeader({ title }: { title: string }) {
  return (
    <header className="screen-header">
      <BackButton />
      <h1 className="t-screen-title">{title}</h1>
    </header>
  );
}
