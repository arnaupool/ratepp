import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../api/client';
import { categoriesApi, tagsApi } from '../api/endpoints';
import ConfirmDialog from '../components/ConfirmDialog';
import { TrashIcon } from '../components/Icons';
import ScreenHeader from '../components/ScreenHeader';
import { Spinner } from '../components/bits';
import { useGroups } from '../hooks/useGroups';
import { setHomeFilters, useHomeFilters } from '../state/homeFilters';
import './ManageLabelsScreen.css';

type Kind = 'category' | 'tag';

interface Pending {
  kind: Kind;
  name: string;
  space: string;
}

// Categories and tags are free text per space: your personal notes and each
// group. A delete removes the label from every note of that space; inside a
// group only its admins can do it.
export default function ManageLabelsScreen() {
  const queryClient = useQueryClient();
  const homeFilters = useHomeFilters();
  const groups = useGroups();
  const [pending, setPending] = useState<Pending | null>(null);
  // Kept separately so the dialog still shows the name while it animates
  // closed (it used to read 'Eliminar "undefined"').
  const [shownName, setShownName] = useState('');
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const askDelete = (p: Pending) => {
    setPending(p);
    setShownName(p.name);
  };

  const confirmDelete = async () => {
    if (!pending) return;
    const { kind, name, space } = pending;
    const key = `${space}:${kind}:${name}`;
    const listKey = [kind === 'category' ? 'categories' : 'tags', space];
    setPending(null);
    setError('');
    setRemoving((s) => new Set(s).add(key));
    try {
      await (kind === 'category' ? categoriesApi.remove(name, space) : tagsApi.remove(name, space));
      // Let the row's exit animation finish before it leaves the list.
      await new Promise((r) => setTimeout(r, 220));
      queryClient.setQueryData(listKey, (old: { categories?: string[]; tags?: string[] } | undefined) =>
        kind === 'category' ? { categories: (old?.categories ?? []).filter((c) => c !== name) } : { tags: (old?.tags ?? []).filter((t) => t !== name) }
      );
      queryClient.invalidateQueries({ queryKey: [listKey[0]] });
      queryClient.invalidateQueries({ queryKey: ['scores'] });
      queryClient.invalidateQueries({ queryKey: ['score'] });
      // A Principal filter on the deleted label would now match nothing.
      if (kind === 'category' && homeFilters.category === name) setHomeFilters({ category: 'Todas' });
      if (kind === 'tag' && homeFilters.tag === name) setHomeFilters({ tag: null });
    } catch (e) {
      setError(errorMessage(e, 'No se pudo eliminar'));
      queryClient.invalidateQueries({ queryKey: listKey });
    } finally {
      setRemoving((s) => {
        const next = new Set(s);
        next.delete(key);
        return next;
      });
    }
  };

  return (
    <div className="screen labels-screen">
      <ScreenHeader title="Categorías y etiquetas" />
      <div className="labels-body">
        {!!error && <p className="labels-error">{error}</p>}
        <SpaceLabels space="me" title={groups.length > 0 ? 'Solo yo' : null} canDelete removing={removing} onDelete={askDelete} />
        {groups.map((g) => (
          <SpaceLabels key={g.id} space={g.id} title={`👥 ${g.name}`} canDelete={g.role === 'admin'} removing={removing} onDelete={askDelete} />
        ))}
      </div>

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

interface SpaceLabelsProps {
  space: string;
  /** null: the only space (no groups), shown without a heading as before. */
  title: string | null;
  canDelete: boolean;
  removing: Set<string>;
  onDelete: (p: Pending) => void;
}

function SpaceLabels({ space, title, canDelete, removing, onDelete }: SpaceLabelsProps) {
  const categories = useQuery({ queryKey: ['categories', space], queryFn: () => categoriesApi.list(space) });
  const tags = useQuery({ queryKey: ['tags', space], queryFn: () => tagsApi.list(space) });
  const mine = space === 'me';

  const list = (kind: Kind, items: string[] | undefined, empty: string) => (
    <div className="labels-list">
      {items && items.length === 0 && <p className="labels-empty">{empty}</p>}
      {items?.map((name) => (
        <div key={name} className={`labels-item${removing.has(`${space}:${kind}:${name}`) ? ' leaving' : ''}`}>
          <span className="labels-item-name">{name}</span>
          {canDelete && (
            <button
              type="button"
              className="labels-item-delete"
              onClick={() => onDelete({ kind, name, space })}
              aria-label={`Eliminar ${kind === 'category' ? 'categoría' : 'etiqueta'} ${name}${title ? ` de ${title.replace('👥 ', '')}` : ''}`}
            >
              <TrashIcon size={16} />
            </button>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <section className={`labels-space${title ? ' titled' : ''}`}>
      {title && <h2 className="labels-space-title">{title}</h2>}
      {title && !canDelete && <p className="labels-empty">Solo un admin del grupo puede borrarlas.</p>}
      {categories.isPending || tags.isPending ? (
        <div className="labels-loading">
          <Spinner />
        </div>
      ) : categories.isError || tags.isError ? (
        <p className="labels-error">No se pudieron cargar las categorías y etiquetas</p>
      ) : (
        <>
          <span className="t-section-label">Categorías</span>
          {list('category', categories.data?.categories, mine ? 'No tienes categorías todavía.' : 'Este grupo no tiene categorías todavía.')}
          <span className="t-section-label labels-second">Etiquetas</span>
          {list('tag', tags.data?.tags, mine ? 'No tienes etiquetas todavía.' : 'Este grupo no tiene etiquetas todavía.')}
        </>
      )}
    </section>
  );
}
