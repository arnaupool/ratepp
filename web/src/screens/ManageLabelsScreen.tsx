import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../api/client';
import { categoriesApi, tagsApi } from '../api/endpoints';
import ConfirmDialog from '../components/ConfirmDialog';
import { TrashIcon } from '../components/Icons';
import ScreenHeader from '../components/ScreenHeader';
import { Spinner } from '../components/bits';
import { setHomeFilters, useHomeFilters } from '../state/homeFilters';
import './ManageLabelsScreen.css';

type Kind = 'category' | 'tag';

export default function ManageLabelsScreen() {
  const queryClient = useQueryClient();
  const homeFilters = useHomeFilters();
  const categories = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const tags = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });
  const [pending, setPending] = useState<{ kind: Kind; name: string } | null>(null);
  // Kept separately so the dialog still shows the name while it animates
  // closed (it used to read 'Eliminar "undefined"').
  const [shownName, setShownName] = useState('');
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const askDelete = (kind: Kind, name: string) => {
    setPending({ kind, name });
    setShownName(name);
  };

  const confirmDelete = async () => {
    if (!pending) return;
    const { kind, name } = pending;
    const key = `${kind}:${name}`;
    setPending(null);
    setError('');
    setRemoving((s) => new Set(s).add(key));
    try {
      await (kind === 'category' ? categoriesApi.remove(name) : tagsApi.remove(name));
      // Let the row's exit animation finish before it leaves the list.
      await new Promise((r) => setTimeout(r, 220));
      queryClient.setQueryData([kind === 'category' ? 'categories' : 'tags'], (old: { categories?: string[]; tags?: string[] } | undefined) =>
        kind === 'category' ? { categories: (old?.categories ?? []).filter((c) => c !== name) } : { tags: (old?.tags ?? []).filter((t) => t !== name) }
      );
      queryClient.invalidateQueries({ queryKey: ['scores'] });
      queryClient.invalidateQueries({ queryKey: ['score'] });
      // A Principal filter on the deleted label would now match nothing.
      if (kind === 'category' && homeFilters.category === name) setHomeFilters({ category: 'Todas' });
      if (kind === 'tag' && homeFilters.tag === name) setHomeFilters({ tag: null });
    } catch (e) {
      setError(errorMessage(e, 'No se pudo eliminar'));
      queryClient.invalidateQueries({ queryKey: [kind === 'category' ? 'categories' : 'tags'] });
    } finally {
      setRemoving((s) => {
        const next = new Set(s);
        next.delete(key);
        return next;
      });
    }
  };

  const section = (kind: Kind, items: string[] | undefined, empty: string) => (
    <div className="labels-list">
      {items && items.length === 0 && <p className="labels-empty">{empty}</p>}
      {items?.map((name) => (
        <div key={name} className={`labels-item${removing.has(`${kind}:${name}`) ? ' leaving' : ''}`}>
          <span className="labels-item-name">{name}</span>
          <button
            type="button"
            className="labels-item-delete"
            onClick={() => askDelete(kind, name)}
            aria-label={`Eliminar ${kind === 'category' ? 'categoría' : 'etiqueta'} ${name}`}
          >
            <TrashIcon size={16} />
          </button>
        </div>
      ))}
    </div>
  );

  const loading = categories.isPending || tags.isPending;

  return (
    <div className="screen">
      <ScreenHeader title="Categorías y etiquetas" />
      {loading ? (
        <div className="labels-loading">
          <Spinner />
        </div>
      ) : (
        <div className="labels-body">
          {!!error && <p className="labels-error">{error}</p>}
          {(categories.isError || tags.isError) && <p className="labels-error">No se pudieron cargar las categorías y etiquetas</p>}
          <span className="t-section-label">Categorías</span>
          {section('category', categories.data?.categories, 'No tienes categorías todavía.')}
          <span className="t-section-label labels-second">Etiquetas</span>
          {section('tag', tags.data?.tags, 'No tienes etiquetas todavía.')}
        </div>
      )}

      <ConfirmDialog
        visible={!!pending}
        title={`¿Eliminar "${shownName}"?`}
        message="Está siendo usada por una o más notas. Se quitará de todas ellas. No se puede deshacer."
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
