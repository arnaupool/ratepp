import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../api/client';
import { categoriesApi, scoresApi } from '../api/endpoints';
import { BackButton } from '../components/ScreenHeader';
import FieldIcon from '../components/FieldIcon';
import { Spinner } from '../components/bits';
import CategoryEditor from '../components/editors/CategoryEditor';
import { ColorPicker, CollapsibleSection } from '../components/editors/ColorPicker';
import CoverPicker from '../components/editors/CoverPicker';
import EditableFieldRow, { type EditableField } from '../components/editors/EditableFieldRow';
import LocationPicker from '../components/editors/LocationPicker';
import NumberPillRow from '../components/editors/NumberPillRow';
import PeopleScoresEditor, { type PersonScore } from '../components/editors/PeopleScoresEditor';
import PhotoGalleryEditor from '../components/editors/PhotoGalleryEditor';
import '../components/editors/editors.css';
import { DEFAULT_CATEGORIES, FIELD_DEFS, asLocation, defaultFieldValue } from '../constants/fieldDefs';
import { usePageBackground } from '../hooks/usePageBackground';
import { useSuggestedColor } from '../hooks/useSuggestedColor';
import { contrastTextColors } from '../utils/colors';
import './CreateScreen.css';

let tempSeq = 0;
const tempId = () => `tmp-${++tempSeq}`;

export default function CreateScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [ownerValue, setOwnerValue] = useState<number | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [others, setOthers] = useState<PersonScore[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fields, setFields] = useState<EditableField[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [cardColor, setCardColor] = useState<string | null>(null);
  const [coverOpen, setCoverOpen] = useState(false);
  const [locationFieldId, setLocationFieldId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // Count of photo uploads in flight (gallery and gallery fields).
  const uploads = useRef(0);
  const [uploadingCount, setUploadingCount] = useState(0);
  const trackUpload = (on: boolean) => {
    uploads.current += on ? 1 : -1;
    setUploadingCount(uploads.current);
  };

  const used = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const suggestions = [...new Set([...DEFAULT_CATEGORIES, ...(used.data?.categories ?? []), ...customCategories])];
  const suggestedColor = useSuggestedColor(photos[0]);

  usePageBackground(cardColor);
  const onColor = contrastTextColors(cardColor);
  const ink = onColor?.ink;
  const sub = onColor?.sub;

  const toggleCategory = (c: string) => setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  const addCustomCategory = (c: string) => {
    setCategories((prev) => (prev.includes(c) ? prev : [...prev, c]));
    if (!suggestions.includes(c)) setCustomCategories((prev) => [...prev, c]);
  };

  const updateField = (id: string, patch: Partial<EditableField>) => setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const moveField = (id: string, dir: -1 | 1) =>
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      [next[target], next[idx]] = [next[idx], next[target]];
      return next;
    });

  const save = async () => {
    setError('');
    (document.activeElement as HTMLElement | null)?.blur();
    if (!title.trim()) return setError('El título es obligatorio');
    if (!ownerValue) return setError('La puntuación (1-10) es obligatoria');
    if (uploads.current > 0) return setError('Espera a que terminen de subirse las fotos');
    setSaving(true);
    try {
      const { score } = await scoresApi.create({
        title: title.trim(),
        categories,
        photoUrls: photos,
        cardColor,
        ownerValue,
        ratings: others.map((o) => ({ personName: o.name.trim() || 'Invitado', value: o.value })),
        fields: fields.map((f) => ({ type: f.type, label: f.label, value: f.value })),
      });
      queryClient.setQueryData(['score', score.id], score);
      queryClient.invalidateQueries({ queryKey: ['scores'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      // Replaces Crear in the history: back from Detalle goes to Principal.
      navigate(`/p/${score.id}`, { replace: true });
    } catch (e) {
      setError(errorMessage(e, 'No se pudo guardar la puntuación'));
      setSaving(false);
    }
  };

  const locationField = fields.find((f) => f.id === locationFieldId);

  return (
    <div className="screen create-screen">
      <div className="create-head">
        <BackButton />
      </div>

      <div className="create-body">
        <input className="create-title" style={ink ? { color: ink } : undefined} placeholder="Título *" value={title} onChange={(e) => setTitle(e.target.value)} />

        <section className="editor-section">
          <span className="t-section-label" style={sub ? { color: sub } : undefined}>
            Fotos
          </span>
          <PhotoGalleryEditor photos={photos} onChange={setPhotos} onError={setError} onOpenCoverSearch={() => setCoverOpen(true)} onUploadingChange={trackUpload} />
        </section>

        <section className="editor-section">
          <span className="t-section-label" style={sub ? { color: sub } : undefined}>
            Categorías
          </span>
          <CategoryEditor categories={categories} suggestions={suggestions} onToggle={toggleCategory} onAddCustom={addCustomCategory} />
        </section>

        <section className="editor-section">
          <span className="t-section-label" style={sub ? { color: sub } : undefined}>
            Nota *
          </span>
          <NumberPillRow value={ownerValue} onSelect={setOwnerValue} />
        </section>

        <section className="editor-section">
          <span className="t-section-label" style={sub ? { color: sub } : undefined}>
            Nota adicional
          </span>
          <PeopleScoresEditor
            people={others}
            editingId={editingId}
            onStartEdit={(id) => setEditingId((cur) => (cur === id ? null : id))}
            onSelectNumber={(id, n) => {
              setOthers((prev) => prev.map((o) => (o.id === id ? { ...o, value: n } : o)));
              setEditingId(null);
            }}
            onRename={(id, name) => setOthers((prev) => prev.map((o) => (o.id === id ? { ...o, name } : o)))}
            onRemove={(id) => {
              setOthers((prev) => prev.filter((o) => o.id !== id));
              setEditingId((cur) => (cur === id ? null : cur));
            }}
            onAdd={() => {
              const id = tempId();
              setOthers((prev) => [...prev, { id, name: 'Nuevo', value: 5 }]);
              setEditingId(id);
            }}
            subColor={sub}
          />
        </section>

        {fields.map((f, idx) => (
          <EditableFieldRow
            key={f.id}
            field={f}
            isFirst={idx === 0}
            isLast={idx === fields.length - 1}
            onChange={(patch) => updateField(f.id, patch)}
            onCommit={() => {}}
            onRemove={() => setFields((prev) => prev.filter((x) => x.id !== f.id))}
            onMove={(dir) => moveField(f.id, dir)}
            onPickLocation={() => setLocationFieldId(f.id)}
            onError={setError}
            onUploadingChange={trackUpload}
          />
        ))}

        <span className="t-section-label" style={sub ? { color: sub } : undefined}>
          Añadir campo
        </span>
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

        <CollapsibleSection title="Color de la card" subColor={sub}>
          <ColorPicker value={cardColor} onChange={setCardColor} suggestedColor={suggestedColor} />
        </CollapsibleSection>

        {!!error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}

        <button type="button" className="btn-primary create-save" onClick={save} disabled={saving} aria-busy={saving || uploadingCount > 0}>
          {saving ? <Spinner small onAccent label="Guardando" /> : 'Guardar puntuación'}
        </button>
      </div>

      <CoverPicker
        visible={coverOpen}
        onClose={() => setCoverOpen(false)}
        onPick={(url) => {
          setPhotos((prev) => [...prev, url]);
          setCoverOpen(false);
        }}
      />

      <LocationPicker
        visible={!!locationField}
        initialValue={locationField ? asLocation(locationField.value) : null}
        onClose={() => setLocationFieldId(null)}
        onConfirm={(value) => {
          if (locationFieldId) updateField(locationFieldId, { value });
          setLocationFieldId(null);
        }}
      />
    </div>
  );
}
