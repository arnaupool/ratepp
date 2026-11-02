import { useGoBack } from '../hooks/useGoBack';
import './ScreenHeader.css';

// keepFocus: tapping it must not blur (and so commit) the input being
// edited, so the "¿Guardar los cambios?" dialog can still offer Descartar.
export function BackButton({ onClick, keepFocus = false }: { onClick?: () => void; keepFocus?: boolean }) {
  const goBack = useGoBack();
  return (
    <button
      type="button"
      className="back-btn"
      onClick={onClick ?? goBack}
      aria-label="Volver"
      data-keep-focus={keepFocus || undefined}
      onPointerDown={keepFocus ? (e) => e.preventDefault() : undefined}
      onMouseDown={keepFocus ? (e) => e.preventDefault() : undefined}
    >
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
