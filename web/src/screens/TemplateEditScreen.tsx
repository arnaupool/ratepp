import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../api/client';
import { categoriesApi, templatesApi } from '../api/endpoints';
import type { NoteTemplate } from '../api/types';
import FieldIcon from '../components/FieldIcon';
import ScreenHeader from '../components/ScreenHeader';
import { Spinner } from '../components/bits';
import CategoryEditor from '../components/editors/CategoryEditor';
import { ColorPicker } from '../components/editors/ColorPicker';
import EditableFieldRow, { type EditableField } from '../components/editors/EditableFieldRow';
import '../components/editors/editors.css';
import EmojiPicker from '../components/templates/EmojiPicker';
import '../components/templates/templates.css';
import { DEFAULT_CATEGORIES, FIELD_DEFS, defaultFieldValue } from '../constants/fieldDefs';
import './GroupsScreen.css';

let seq = 0;
const tempId = () => `tpl-${++seq}`;

// Edits everything a template keeps (docs/plantillas.md): name, emoticon,
// categories, who else scores, color and the fields' shape. Values can't be
// typed here: the fields show only what a template stores.
export default function TemplateEditScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ['template', id], queryFn: () => templatesApi.get(id) });
  const used = useQuery({ queryKey: ['categories', 'all'], queryFn: () => categoriesApi.list('all') });

  const [loaded, setLoaded] = useState<NoteTemplate | null>(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [people, setPeople] = useState<string[]>([]);
  const [person, setPerson] = useState('');
  const [cardColor, setCardColor] = useState<string | null>(null);
  const [fields, setFields] = useState<EditableField[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = q.data?.template;
    if (!t || loaded) return;
    setLoaded(t);
    setName(t.name);
    setEmoji(t.emoji);
    setCategories(t.categories);
    setCustomCategories(t.categories);
    setPeople(t.people);
    setCardColor(t.cardColor);
    setFields(t.fields.map((f) => ({ id: tempId(), type: f.type, label: f.label, value: f.value })));
  }, [q.data, loaded]);

  const suggestions = [...new Set([...DEFAULT_CATEGORIES, ...(used.data?.categories ?? []), ...customCategories])];

  const moveField = (fid: string, dir: -1 | 1) =>
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === fid);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      [next[target], next[idx]] = [next[idx], next[target]];
      return next;
    });

  const addPerson = () => {
    const clean = person.trim();
    if (clean && !people.some((p) => p.toLowerCase() === clean.toLowerCase())) setPeople((prev) => [...prev, clean]);
    setPerson('');
  };

  const save = async () => {
    if (!name.trim()) return setError('Ponle un nombre');
    if (!emoji) return setError('Elige un emoticono');
    setError('');
    setSaving(true);
    try {
      await templatesApi.update(id, {
        name: name.trim(),
        emoji,
        categories,
        cardColor,
        people,
        fields: fields.map((f) => ({ type: f.type, label: f.label, value: f.value })),
      });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template', id] });
      navigate(-1);
    } catch (e) {
      setError(errorMessage(e, 'No se pudo guardar la plantilla'));
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="screen groups-screen">
        <ScreenHeader title="Plantilla" />
        <div className="groups-status">{q.isError ? errorMessage(q.error, 'No se pudo cargar la plantilla') : <Spinner />}</div>
      </div>
    );
  }

  if (!loaded.canManage) {
    return (
      <div className="screen groups-screen">
        <ScreenHeader title={loaded.name} />
        <p className="groups-status">Solo quien la creó o un admin del grupo puede cambiarla.</p>
      </div>
    );
  }

  return (
    <div className="screen groups-screen template-edit">
      <ScreenHeader title="Editar plantilla" />
      <div className="groups-body">
        <p className="groups-intro">
          {loaded.groupName ? `Plantilla del grupo 👥 ${loaded.groupName}. ` : ''}Aquí solo se definen los campos: sus valores se rellenan en cada puntuación.
        </p>

        <label className="editor-section">
          <span className="t-section-label">Nombre</span>
          <input className="editor-input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} aria-label="Nombre de la plantilla" />
        </label>

        <section className="editor-section">
          <span className="t-section-label">Emoticono</span>
          <EmojiPicker value={emoji} onChange={setEmoji} />
        </section>

        <section className="editor-section">
          <span className="t-section-label">Categorías</span>
          <CategoryEditor
            categories={categories}
            suggestions={suggestions}
            onToggle={(c) => setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))}
            onAddCustom={(c) => {
              setCategories((prev) => (prev.includes(c) ? prev : [...prev, c]));
              if (!suggestions.includes(c)) setCustomCategories((prev) => [...prev, c]);
            }}
          />
        </section>

        <section className="editor-section">
          <span className="t-section-label">Quién más puntúa</span>
          {people.length > 0 && (
            <div className="chip-wrap">
              {people.map((p) => (
                <button key={p} type="button" className="select-chip on" onClick={() => setPeople((prev) => prev.filter((x) => x !== p))} aria-label={`Quitar a ${p}`}>
                  {p} ✕
                </button>
              ))}
            </div>
          )}
          <input
            className="editor-input"
            placeholder="Escribe un nombre y pulsa enter"
            value={person}
            maxLength={40}
            enterKeyHint="done"
            onChange={(e) => setPerson(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addPerson();
              }
            }}
            onBlur={addPerson}
            aria-label="Añadir persona"
          />
        </section>

        <section className="editor-section">
          <span className="t-section-label">Campos</span>
          {fields.map((f, idx) => (
            <EditableFieldRow
              key={f.id}
              field={f}
              isFirst={idx === 0}
              isLast={idx === fields.length - 1}
              shapeOnly
              onChange={(patch) => setFields((prev) => prev.map((x) => (x.id === f.id ? { ...x, ...patch } : x)))}
              onCommit={() => {}}
              onRemove={() => setFields((prev) => prev.filter((x) => x.id !== f.id))}
              onMove={(dir) => moveField(f.id, dir)}
              onPickLocation={() => {}}
              onError={setError}
            />
          ))}
          <div className="quick-row">
            {FIELD_DEFS.map((def) => (
              <button
                type="button"
                key={def.id}
                className="quick-chip"
                onClick={() => setFields((prev) => [...prev, { id: tempId(), type: def.id, label: def.label, value: defaultFieldValue(def.kind) }])}
              >
                <FieldIcon type={def.id} size="chip" />
                {def.label}
              </button>
            ))}
          </div>
        </section>

        <section className="editor-section">
          <span className="t-section-label">Color de la card</span>
          <ColorPicker value={cardColor} onChange={setCardColor} suggestedColor={null} />
        </section>

        {!!error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <button type="button" className="btn-primary" onClick={save} disabled={saving}>
          {saving ? <Spinner small onAccent label="Guardando" /> : 'Guardar plantilla'}
        </button>
      </div>
    </div>
  );
}
