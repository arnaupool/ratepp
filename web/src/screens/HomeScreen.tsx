import { useState } from 'react';
import MenuIcon from '../components/MenuIcon';
import SideMenu from '../components/SideMenu';
import './HomeScreen.css';

export default function HomeScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="screen home-screen">
      <header className="home-head">
        <button type="button" className="home-menu-btn" onClick={() => setMenuOpen((v) => !v)} aria-label="Abrir menú">
          <MenuIcon open={menuOpen} />
        </button>
        <h1 className="t-screen-title">Tus puntuaciones</h1>
      </header>
      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
