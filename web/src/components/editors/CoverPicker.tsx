import { useState, type FormEvent } from 'react';
import { errorMessage } from '../../api/client';
import { coversApi, type CoverResult } from '../../api/endpoints';
import { COVER_TYPES } from '../../constants/fieldDefs';
import Sheet from '../Sheet';
import { Spinner } from '../bits';

interface TabState {
  query: string;
  results: CoverResult[];
  loading: boolean;
  error: string;
  searched: boolean;
}

const EMPTY: TabState = { query: '', results: [], loading: false, error: '', searched: false };

// "Buscar carátula": each tab keeps its own query and results, so switching
// tabs never carries one search into another.
export default function CoverPicker({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (url: string) => void }) {
  const [type, setType] = useState<string>('movie');
  const [tabs, setTabs] = useState<Record<string, TabState>>({});
  const current = tabs[type] ?? EMPTY;
  const patch = (t: string, p: Partial<TabState>) => setTabs((prev) => ({ ...prev, [t]: { ...(prev[t] ?? EMPTY), ...p } }));

  const search = async (e?: FormEvent) => {
    e?.preventDefault();
    const tab = type;
    const q = (tabs[tab]?.query ?? '').trim();
    if (!q) return;
    (document.activeElement as HTMLElement | null)?.blur();
    patch(tab, { loading: true, error: '', searched: true });
    try {
      const { results, note } = await coversApi.search(tab, q);
      patch(tab, { results: results ?? [], loading: false, error: !results?.length && note ? note : '' });
    } catch (err) {
      patch(tab, { results: [], loading: false, error: errorMessage(err, 'No se pudo buscar') });
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} className="cover-sheet" label="Buscar carátula">
      <h2 className="sheet-title">Buscar carátula</h2>
      <div className="cover-tabs" role="tablist">
        {COVER_TYPES.map((t) => (
          <button
            type="button"
            role="tab"
            key={t.id}
            aria-selected={type === t.id}
            className={`filters-tag${type === t.id ? ' on' : ''}`}
            onClick={() => setType(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <form className="sheet-search-row" onSubmit={search}>
        <input
          className="sheet-input"
          type="search"
          enterKeyHint="search"
          placeholder="Título..."
          value={current.query}
          onChange={(e) => patch(type, { query: e.target.value })}
        />
        <button type="submit" className="sheet-search-btn" aria-label="Buscar">
          🔍
        </button>
      </form>
      <div className="cover-results">
        {current.loading ? (
          <div className="cover-status">
            <Spinner />
          </div>
        ) : current.error ? (
          <p className="cover-status">{current.error}</p>
        ) : current.searched && current.results.length === 0 ? (
          <p className="cover-status">Sin resultados</p>
        ) : (
          <div className="cover-grid">
            {current.results.map((r) => (
              <button type="button" key={r.id} className="cover-card" onClick={() => onPick(r.posterUrl)}>
                <img src={r.posterUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                <span className="cover-card-title">{r.title}</span>
                {!!r.subtitle && <span className="cover-card-sub">{r.subtitle}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      <button type="button" className="sheet-btn-text cover-close" onClick={onClose}>
        Cerrar
      </button>
    </Sheet>
  );
}
