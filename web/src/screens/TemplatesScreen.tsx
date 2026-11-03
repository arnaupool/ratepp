import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../api/client';
import { templatesApi } from '../api/endpoints';
import type { NoteTemplate } from '../api/types';
import ConfirmDialog from '../components/ConfirmDialog';
import ScreenHeader from '../components/ScreenHeader';
import Sheet from '../components/Sheet';
import { Spinner } from '../components/bits';
import EmojiPicker from '../components/templates/EmojiPicker';
import '../components/editors/editors.css';
import '../components/templates/templates.css';
import './GroupsScreen.css';

function summary(t: NoteTemplate) {
  const parts = [t.fields.length === 1 ? '1 campo' : `${t.fields.length} campos`];
  if (t.categories.length) parts.push(t.categories.join(', '));
  if (t.people.length) parts.push(`con ${t.people.join(', ')}`);
  return parts.join(' · ');
}

// Your templates and your groups' ones: rename, change the emoticon or
// delete them (their creator or a group admin). They are made from Nueva
// puntuación or a note's edit mode with "Guardar como plantilla".
export default function TemplatesScreen() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error: loadError } = useQuery({ queryKey: ['templates'], queryFn: templatesApi.list });
  const [editing, setEditing] = useState<NoteTemplate | null>(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [toDelete, setToDelete] = useState<NoteTemplate | null>(null);
  const [error, setError] = useState('');

  const templates = data?.templates ?? [];
  const sections: { key: string; title: string; items: NoteTemplate[] }[] = [];
  const mine = templates.filter((t) => !t.groupId);
  if (mine.length) sections.push({ key: 'me', title: 'Mías', items: mine });
  for (const t of templates) {
    if (!t.groupId) continue;
    const s = sections.find((x) => x.key === t.groupId);
    if (s) s.items.push(t);
    else sections.push({ key: t.groupId, title: `👥 ${t.groupName ?? 'Grupo'}`, items: [t] });
  }

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['templates'] });

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();
    const t = editing;
    if (!t) return;
    if (!name.trim()) return setError('Ponle un nombre');
    if (!emoji) return setError('Elige un emoticono');
    setError('');
    try {
      await templatesApi.update(t.id, { name: name.trim(), emoji });
      setEditing(null);
      refresh();
    } catch (err) {
      setError(errorMessage(err, 'No se pudo guardar'));
    }
  };

  return (
    <div className="screen groups-screen">
      <ScreenHeader title="Plantillas" />
      <div className="groups-body">
        <p className="groups-intro">
          Usa una plantilla desde Nueva puntuación para empezar con los campos, categorías y personas de siempre. Para crear una, rellena una puntuación y pulsa
          «Guardar como plantilla».
        </p>
        {!editing && !!error && <p className="error-text">{error}</p>}

        {isPending ? (
          <div className="groups-status">
            <Spinner />
          </div>
        ) : isError ? (
          <p className="groups-status">{errorMessage(loadError, 'No se pudieron cargar las plantillas')}</p>
        ) : templates.length === 0 ? (
          <p className="groups-status">Todavía no tienes plantillas.</p>
        ) : (
          sections.map((s) => (
            <section key={s.key} className="groups-section">
              <span className="t-section-label">{s.title}</span>
              <div className="groups-list">
                {s.items.map((t) => (
                  <div key={t.id} className="groups-member">
                    <span className="template-row-emoji" aria-hidden>
                      {t.emoji}
                    </span>
                    <span className="groups-member-text">
                      <span className="groups-item-name">{t.name}</span>
                      <span className="groups-item-meta">{summary(t)}</span>
                    </span>
                    {t.canManage && (
                      <span className="groups-member-actions">
                        <button
                          type="button"
                          className="select-chip"
                          onClick={() => {
                            setEditing(t);
                            setName(t.name);
                            setEmoji(t.emoji);
                            setError('');
                          }}
                          aria-label={`Editar ${t.name}`}
                        >
                          Editar
                        </button>
                        <button type="button" className="select-chip danger" onClick={() => setToDelete(t)} aria-label={`Borrar ${t.name}`}>
                          Borrar
                        </button>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <Sheet visible={!!editing} onClose={() => setEditing(null)} label="Editar plantilla">
        <form className="template-form" onSubmit={saveEdit}>
          <h2 className="sheet-title">Editar plantilla</h2>
          <input className="editor-input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} aria-label="Nombre de la plantilla" />
          <span className="t-section-label">Emoticono</span>
          <EmojiPicker value={emoji} onChange={setEmoji} />
          {!!error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <div className="sheet-actions">
            <button type="button" className="sheet-btn-text" onClick={() => setEditing(null)}>
              Cancelar
            </button>
            <button type="submit" className="sheet-btn-main">
              Guardar
            </button>
          </div>
        </form>
      </Sheet>

      <ConfirmDialog
        visible={!!toDelete}
        title={`¿Borrar «${toDelete?.name ?? ''}»?`}
        message="Las notas que ya creaste con ella no cambian."
        confirmLabel="Borrar"
        onConfirm={async () => {
          const t = toDelete;
          setToDelete(null);
          if (!t) return;
          try {
            await templatesApi.remove(t.id);
            refresh();
          } catch (err) {
            setError(errorMessage(err, 'No se pudo borrar'));
          }
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
