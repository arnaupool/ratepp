import './MenuIcon.css';

// Hamburger that morphs into an X in step with the side menu's slide.
export default function MenuIcon({ open }: { open: boolean }) {
  return (
    <span className={`menu-icon${open ? ' open' : ''}`} aria-hidden="true">
      <span className="menu-bar b1" />
      <span className="menu-bar b2" />
      <span className="menu-bar b3" />
    </span>
  );
}
