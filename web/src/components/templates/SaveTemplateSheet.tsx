import { useEffect, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../../api/client';
import { templatesApi } from '../../api/endpoints';
import type { NewTemplate, NoteTemplate } from '../../api/types';
import { useGroups } from '../../hooks/useGroups';
import Sheet from '../Sheet';
import SpaceRow from '../SpaceRow';
import { Spinner } from '../bits';
import EmojiPicker from './EmojiPicker';
import '../SpaceRow.css';
import './templates.css';

export type TemplateDraft = Omit<NewTemplate, 'name' | 'emoji' | 'groupId'>;

interface Props {
  visible: boolean;
  onClose: () => void;
  /** The note as it is now; the server keeps only its shape. */
  draft: TemplateDraft;
  /** Where the note lives: the template is offered there first. */
  space: string;
  onSaved: (template: NoteTemplate) => void;
}

// "Guardar como plantilla": a name, an emoticon and whose it is.
export default function SaveTemplateSheet({ visible, onClose, draft, space, onSaved }: Props) {
  const queryClient = useQueryClient();
  const groups = useGroups();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [owner, setOwner] = useState('me');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName('');
    setEmoji('');
    setError('');
    setOwner(space !== 'all' && groups.some((g) => g.id === space) ? space : 'me');
    // Only when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Ponle un nombre');
    if (!emoji) return setError('Elige un emoticono');
    setError('');
    setSaving(true);
    try {
      const { template } = await templatesApi.create({ ...draft, name: name.trim(), emoji, groupId: owner === 'me' ? null : owner });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      onSaved(template);
    } catch (err) {
      setError(errorMessage(err, 'No se pudo guardar la plantilla'));
    } finally {
      setSaving(false);
    }
  };

  const fieldCount = draft.fields.length;

  return (
    <Sheet visible={visible} onClose={onClose} label="Guardar como plantilla">
      <form className="template-form" onSubmit={submit}>
        <h2 className="sheet-title">Guardar como plantilla</h2>
        <p className="sheet-message">
          Se guardan {fieldCount === 1 ? '1 campo' : `${fieldCount} campos`} con sus nombres (y los de los criterios), las categorías, el color y quién más
          puntúa. Los valores se quedan vacíos.
        </p>
        <input
          className="editor-input"
          placeholder="Nombre, p. ej. Restaurante"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          aria-label="Nombre de la plantilla"
        />
        <span className="t-section-label">Emoticono</span>
        <EmojiPicker value={emoji} onChange={setEmoji} />
        {groups.length > 0 && (
          <>
            <span className="t-section-label">De quién</span>
            <SpaceRow groups={groups} value={owner} onChange={setOwner} label="De quién es la plantilla" />
          </>
        )}
        {!!error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="sheet-actions">
          <button type="button" className="sheet-btn-text" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="sheet-btn-main" disabled={saving}>
            {saving ? <Spinner small onAccent label="Guardando" /> : 'Guardar plantilla'}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
