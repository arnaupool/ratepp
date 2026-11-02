import { useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useNavigate } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { categoriesApi, scoresApi, tagsApi } from '../api/endpoints';
import type { ScoreSummary } from '../api/types';
import MenuIcon from '../components/MenuIcon';
import SideMenu from '../components/SideMenu';
import Sheet from '../components/Sheet';
import DateField from '../components/DateField';
import { FilterChip, Photo, PhotoStripe, ScoreStack, Spinner, TagChip } from '../components/bits';
import { useDebounced } from '../hooks/useDebounced';
import { setHomeFilters, useHomeFilters } from '../state/homeFilters';
import { categoryTint, contrastTextColors } from '../utils/colors';
import './HomeScreen.css';

export default function HomeScreen() {
  const navigate = useNavigate();
  const { searchInput, category, tag, dateFrom, dateTo } = useHomeFilters();
  const [menuOpen, setMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [gridRef] = useAutoAnimate<HTMLDivElement>();
  // Matching happens server-side (title, categories and field values).
  const search = useDebounced(searchInput, 300);

  const filters = { search, category, tag, dateFrom, dateTo };
  const scores = useQuery({
    queryKey: ['scores', filters],
    queryFn: () => scoresApi.list(filters),
    placeholderData: keepPreviousData,
  });
  // Chips and tag filters list ALL of the user's categories/tags, not just
  // the ones in the current results.
  const categories = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const tags = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });

  const activeFilterCount = (tag ? 1 : 0) + (dateFrom || dateTo ? 1 : 0);
  const isFiltering = !!search || category !== 'Todas' || !!tag || !!dateFrom || !!dateTo;
  const items = scores.data?.items ?? [];
  const tagList = tags.data?.tags ?? [];
  const chipList = ['Todas', ...(categories.data?.categories ?? [])];
  if (category !== 'Todas' && !chipList.includes(category)) chipList.push(category);

  return (
    <div className="screen home-screen">
      <header className="home-head">
        <button type="button" className="home-menu-btn" onClick={() => setMenuOpen((v) => !v)} aria-label="Abrir menú">
          <MenuIcon open={menuOpen} />
        </button>
        <h1 className="t-screen-title">Tus puntuaciones</h1>
      </header>

      <div className="home-search-row">
        <label className="home-search">
          <span className="home-search-icon" aria-hidden="true">
            ⌕
          </span>
          <input
            type="search"
            enterKeyHint="search"
            placeholder="Buscar por título, texto, fecha, categoría o etiqueta..."
            value={searchInput}
            onChange={(e) => setHomeFilters({ searchInput: e.target.value })}
          />
          {searchInput.length > 0 && (
            <button type="button" className="home-search-clear" onClick={() => setHomeFilters({ searchInput: '' })} aria-label="Borrar búsqueda">
              ✕
            </button>
          )}
        </label>
        <button
          type="button"
          className={`home-filters-btn${activeFilterCount > 0 ? ' active' : ''}`}
          onClick={() => setFiltersOpen(true)}
          aria-label="Filtros de fecha y etiqueta"
        >
          <span aria-hidden="true">⚙︎</span>
          {activeFilterCount > 0 && <span className="home-filters-dot">{activeFilterCount}</span>}
        </button>
      </div>

      <div className="home-chips no-scrollbar">
        {chipList.map((c) => (
          <FilterChip key={c} label={c} active={category === c} onClick={() => setHomeFilters({ category: c })} />
        ))}
      </div>

      {scores.isPending ? (
        <div className="home-center">
          <Spinner />
        </div>
      ) : scores.isError && !scores.data ? (
        <div className="home-center">
          <p className="home-error">No se pudieron cargar tus puntuaciones</p>
        </div>
      ) : items.length === 0 ? (
        <div className="home-center">
          <p className="home-empty-title">{isFiltering ? 'No hay notas' : 'Todavía no hay puntuaciones'}</p>
          <p className="home-empty-sub">
            {isFiltering ? 'Toca el botón + para crear una.' : 'Toca el botón + para puntuar tu primer restaurante, peli o recuerdo.'}
          </p>
        </div>
      ) : (
        <div className="home-grid" ref={gridRef}>
          {items.map((item) => (
            <ScoreCard key={item.id} item={item} onOpen={() => navigate(`/p/${item.id}`)} />
          ))}
        </div>
      )}

      <button type="button" className="home-fab" onClick={() => navigate('/nueva')} aria-label="Crear puntuación">
        +
      </button>

      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />

      <Sheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} className="filters-sheet" label="Filtros">
        <h2 className="sheet-title">Filtros</h2>

        <section className="filters-section">
          <span className="t-section-label">Fecha</span>
          <div className="filters-date-row">
            <div className="filters-date">
              <span className="filters-date-label">Desde</span>
              <div className="filters-date-box">
                <DateField value={dateFrom} onChange={(v) => setHomeFilters({ dateFrom: v })} label="Desde" />
              </div>
            </div>
            <div className="filters-date">
              <span className="filters-date-label">Hasta</span>
              <div className="filters-date-box">
                <DateField value={dateTo} onChange={(v) => setHomeFilters({ dateTo: v })} label="Hasta" />
              </div>
            </div>
          </div>
        </section>

        <section className="filters-section">
          <span className="t-section-label">Etiquetas</span>
          {tagList.length === 0 ? (
            <p className="filters-empty">Todavía no has usado ninguna etiqueta.</p>
          ) : (
            <div className="filters-tags">
              {tagList.map((t) => (
                <button
                  type="button"
                  key={t}
                  className={`filters-tag${tag === t ? ' on' : ''}`}
                  onClick={() => setHomeFilters({ tag: tag === t ? null : t })}
                  aria-pressed={tag === t}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="sheet-actions">
          <button type="button" className="sheet-btn-text" onClick={() => setHomeFilters({ tag: null, dateFrom: null, dateTo: null })}>
            Limpiar filtros
          </button>
          <button type="button" className="sheet-btn-main" onClick={() => setFiltersOpen(false)}>
            Listo
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function ScoreCard({ item, onOpen }: { item: ScoreSummary; onOpen: () => void }) {
  const tint = item.cardColor || categoryTint(item.categories[0]);
  // A custom color can be light or dark whatever the theme, so the title
  // picks its own contrast; category tints already pair with the theme ink.
  const titleColor = item.cardColor ? contrastTextColors(item.cardColor)?.ink : undefined;
  const cover = item.photoUrls[0];
  return (
    <button type="button" className="score-card" style={{ background: tint }} onClick={onOpen} aria-label={`Ver ${item.title}`}>
      {cover ? (
        <Photo url={cover} thumb sizes="(min-width: 600px) 260px, 50vw" className="score-card-photo" />
      ) : (
        <PhotoStripe id={item.id} className="score-card-photo" stripe={14} />
      )}
      <span className="score-card-body">
        <span className="score-card-top">
          <span className="score-card-title" style={titleColor ? { color: titleColor } : undefined}>
            {item.title}
          </span>
          <ScoreStack ratings={item.ratings} />
        </span>
        {item.categories.length > 0 && (
          <span className="score-card-tags">
            {item.categories.map((c) => (
              <TagChip key={c} label={c} />
            ))}
          </span>
        )}
      </span>
    </button>
  );
}
