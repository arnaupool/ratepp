import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useBlocker, useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../api/client';
import { categoriesApi, scoresApi } from '../api/endpoints';
import type { Field, Rating, ScoreDetail } from '../api/types';
import FieldIcon from '../components/FieldIcon';
import Sheet from '../components/Sheet';
import { BackButton } from '../components/ScreenHeader';
import { ScoreBadge } from '../components/bits';
import CategoryEditor from '../components/editors/CategoryEditor';
import { ColorPicker, CollapsibleSection } from '../components/editors/ColorPicker';
import CoverPicker from '../components/editors/CoverPicker';
import EditableFieldRow, { type EditableField } from '../components/editors/EditableFieldRow';
import LocationPicker from '../components/editors/LocationPicker';
import NumberPillRow from '../components/editors/NumberPillRow';
import PeopleScoresEditor from '../components/editors/PeopleScoresEditor';
import PhotoGalleryEditor from '../components/editors/PhotoGalleryEditor';
import '../components/editors/editors.css';
import { DEFAULT_CATEGORIES, FIELD_DEFS, asLocation, defaultFieldValue } from '../constants/fieldDefs';
import { useGoBack } from '../hooks/useGoBack';
import { usePageBackground } from '../hooks/usePageBackground';
import { useSuggestedColor } from '../hooks/useSuggestedColor';
import { contrastTextColors } from '../utils/colors';
import SpaceRow from '../components/SpaceRow';
import '../components/SpaceRow.css';
import { useGroups } from '../hooks/useGroups';
import { NoteSpaceContext } from '../state/noteSpace';
import SaveTemplateSheet from '../components/templates/SaveTemplateSheet';
import '../components/templates/templates.css';

interface Props {
  score: ScoreDetail;
  setScore: Dispatch<SetStateAction<ScoreDetail>>;
  onDone: () => void;
}

// Detalle's edit mode. There is no save button: every change goes to the
// API right away (typed text on blur, everything else on tap). If a request
// fails, the local change is reverted to the last saved value and the error
// shown.
export default function DetailEditMode({ score, setScore, onDone }: Props) {
  const queryClient = useQueryClient();
  const goBack = useGoBack();
  const id = score.id;
  const [error, setError] = useState('');
  const [fieldsRef] = useAutoAnimate<HTMLDivElement>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [coverOpen, setCoverOpen] = useState(false);
  const [locationFieldId, setLocationFieldId] = useState<string | null>(null);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateNotice, setTemplateNotice] = useState('');
  const navigate = useNavigate();
  const groups = useGroups();
  const space = score.groupId ?? 'me';
  const used = useQuery({ queryKey: ['categories', space], queryFn: () => categoriesApi.list(space) });
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const suggestions = [...new Set([...DEFAULT_CATEGORIES, ...(used.data?.categories ?? []), ...customCategories])];
  const suggestedColor = useSuggestedColor(score.photoUrls[0]);

  // Last state the server confirmed, to revert to when a request fails.
  const saved = useRef(score);
  // True while the leave dialog is open or after "Descartar": the blur that
  // closing the keyboard causes must not save the pending text.
  const suspendCommits = useRef(false);
  const pendingInput = useRef<HTMLElement | null>(null);
  // Set when the app itself must leave (the note is no longer reachable).
  const leaveFreely = useRef(false);

  usePageBackground(score.cardColor);
  const onColor = contrastTextColors(score.cardColor);
  const ink = onColor ? { color: onColor.ink } : undefined;
  const subColor = onColor?.sub;
  const sub = subColor ? { color: subColor } : undefined;

  const invalidateLists = () => {
    queryClient.invalidateQueries({ queryKey: ['scores'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['tags'] });
  };

  // ---- score-level properties (title, categories, photos, color) ----
  type ScoreProps = Pick<ScoreDetail, 'title' | 'categories' | 'photoUrls' | 'cardColor'>;
  const saveScore = async (patch: Partial<ScoreProps>, failMessage: string) => {
    if (suspendCommits.current) return;
    setScore((s) => ({ ...s, ...patch }));
    try {
      await scoresApi.update(id, patch);
      saved.current = { ...saved.current, ...patch };
      invalidateLists();
    } catch (e) {
      const keys = Object.keys(patch) as (keyof ScoreProps)[];
      setScore((s) => ({ ...s, ...Object.fromEntries(keys.map((k) => [k, saved.current[k]])) }));
      setError(errorMessage(e, failMessage));
    }
  };

  const toggleCategory = (c: string) => {
    const next = score.categories.includes(c) ? score.categories.filter((x) => x !== c) : [...score.categories, c];
    saveScore({ categories: next }, 'No se pudo actualizar las categorías');
  };

  // ---- ratings ----
  // Your own score is saved with your account; other members' scores are
  // theirs to change; the free-named "Nota adicional" ones anyone edits.
  const mine = score.ratings.find((r) => r.isMe);
  const members = score.ratings.filter((r) => r.userId && !r.isMe);
  const others = score.ratings.filter((r) => !r.userId).sort((a, b) => a.sortOrder - b.sortOrder);
  const setRatings = (fn: (r: Rating[]) => Rating[]) => setScore((s) => ({ ...s, ratings: fn(s.ratings) }));
  const restoreRatings = () => setScore((s) => ({ ...s, ratings: saved.current.ratings }));
  const confirmRatings = () => {
    setScore((s) => {
      saved.current = { ...saved.current, ratings: s.ratings };
      return s;
    });
    invalidateLists();
  };

  const selectNumber = async (ratingId: string, value: number) => {
    setRatings((rs) => rs.map((r) => (r.id === ratingId ? { ...r, value } : r)));
    setEditingId(null);
    try {
      await scoresApi.updateRating(id, ratingId, { value });
      confirmRatings();
    } catch (e) {
      restoreRatings();
      setError(errorMessage(e, 'No se pudo guardar la puntuación'));
    }
  };

  const rateMe = async (value: number) => {
    const prev = score.ratings;
    if (mine) setRatings((rs) => rs.map((r) => (r.id === mine.id ? { ...r, value } : r)));
    try {
      const { rating } = await scoresApi.rateMe(id, value);
      setRatings((rs) => (rs.some((r) => r.id === rating.id) ? rs.map((r) => (r.id === rating.id ? rating : r)) : [...rs, rating]));
      confirmRatings();
    } catch (e) {
      setScore((s) => ({ ...s, ratings: prev }));
      setError(errorMessage(e, 'No se pudo guardar la puntuación'));
    }
  };

  // Moving the note to another space (author or group admin).
  const moveTo = async (target: string) => {
    if (target === space) return;
    setError('');
    try {
      const res = await scoresApi.update(id, { groupId: target === 'me' ? null : target });
      invalidateLists();
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      if (!res) {
        // An admin moved someone else's note out of the group: it's no longer visible to them.
        suspendCommits.current = true;
        leaveFreely.current = true;
        queryClient.removeQueries({ queryKey: ['score', id] });
        navigate('/', { replace: true });
        return;
      }
      setScore((s) => ({ ...s, groupId: res.score.groupId, groupName: res.score.groupName }));
      saved.current = { ...saved.current, groupId: res.score.groupId, groupName: res.score.groupName };
    } catch (e) {
      setError(errorMessage(e, 'No se pudo mover la puntuación'));
    }
  };

  const renameCommit = async (ratingId: string) => {
    if (suspendCommits.current) return;
    const rating = score.ratings.find((r) => r.id === ratingId);
    if (!rating) return;
    const name = rating.personName.trim() || 'Invitado';
    setRatings((rs) => rs.map((r) => (r.id === ratingId ? { ...r, personName: name } : r)));
    try {
      await scoresApi.updateRating(id, ratingId, { personName: name });
      confirmRatings();
    } catch (e) {
      restoreRatings();
      setError(errorMessage(e, 'No se pudo renombrar'));
    }
  };

  const addPerson = async () => {
    try {
      const { rating } = await scoresApi.addRating(id, { personName: 'Nuevo', value: 5 });
      setRatings((rs) => [...rs, rating]);
      confirmRatings();
      setEditingId(rating.id);
    } catch (e) {
      setError(errorMessage(e, 'No se pudo añadir la persona'));
    }
  };

  const removePerson = async (ratingId: string) => {
    setRatings((rs) => rs.filter((r) => r.id !== ratingId));
    setEditingId((cur) => (cur === ratingId ? null : cur));
    try {
      await scoresApi.removeRating(id, ratingId);
      confirmRatings();
    } catch (e) {
      restoreRatings();
      setError(errorMessage(e, 'No se pudo quitar'));
    }
  };

  // ---- fields ----
  const setFields = (fn: (f: Field[]) => Field[]) => setScore((s) => ({ ...s, fields: fn(s.fields) }));
  const savedField = (fieldId: string) => saved.current.fields.find((f) => f.id === fieldId);

  const commitField = async (fieldId: string, patch: Partial<EditableField>, failMessage: string) => {
    if (suspendCommits.current) return;
    const before = savedField(fieldId);
    if (before && Object.entries(patch).every(([k, v]) => JSON.stringify(before[k as keyof Field]) === JSON.stringify(v))) return;
    try {
      const { field } = await scoresApi.updateField(id, fieldId, patch);
      saved.current = { ...saved.current, fields: saved.current.fields.map((f) => (f.id === fieldId ? field : f)) };
      invalidateLists();
    } catch (e) {
      if (before) setFields((fs) => fs.map((f) => (f.id === fieldId ? { ...f, label: before.label, value: before.value } : f)));
      setError(errorMessage(e, failMessage));
    }
  };

  const addField = async (def: (typeof FIELD_DEFS)[number]) => {
    try {
      const { field } = await scoresApi.addField(id, { type: def.id, label: def.label, value: defaultFieldValue(def.kind) });
      setFields((fs) => [...fs, field]);
      saved.current = { ...saved.current, fields: [...saved.current.fields, field] };
    } catch (e) {
      setError(errorMessage(e, 'No se pudo añadir el campo'));
    }
  };

  const removeField = async (fieldId: string) => {
    const prev = score.fields;
    setFields((fs) => fs.filter((f) => f.id !== fieldId));
    try {
      await scoresApi.removeField(id, fieldId);
      saved.current = { ...saved.current, fields: saved.current.fields.filter((f) => f.id !== fieldId) };
      invalidateLists();
    } catch (e) {
      setFields(() => prev);
      setError(errorMessage(e, 'No se pudo quitar el campo'));
    }
  };

  const moveField = async (fieldId: string, dir: -1 | 1) => {
    const prev = score.fields;
    const idx = prev.findIndex((f) => f.id === fieldId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= prev.length) return;
    const next = prev.slice();
    [next[target], next[idx]] = [next[idx], next[target]];
    setFields(() => next);
    try {
      await scoresApi.reorderFields(id, next.map((f) => f.id));
    } catch (e) {
      setFields(() => prev);
      setError(errorMessage(e, 'No se pudo reordenar'));
    }
  };

  // ---- leaving edit mode / the screen ----
  // Going back while editing asks first: a typed value only saves on blur,
  // so leaving straight away could drop it.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => !leaveFreely.current && currentLocation.pathname !== nextLocation.pathname);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    const active = document.activeElement;
    pendingInput.current = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement ? active : null;
    suspendCommits.current = true;
    setLeaving(true);
  }, [blocker.state]);

  const saveAndLeave = () => {
    suspendCommits.current = false;
    // Re-focusing and blurring the input that was being edited fires its
    // commit-on-blur handler.
    const el = pendingInput.current;
    if (el?.isConnected) {
      el.focus({ preventScroll: true });
      el.blur();
    }
    setLeaving(false);
    window.setTimeout(() => blocker.proceed?.(), 0);
  };
  const discardAndLeave = () => {
    setLeaving(false);
    blocker.proceed?.();
    // The cached copy mirrors local state, discarded text included.
    window.setTimeout(() => queryClient.removeQueries({ queryKey: ['score', id] }), 0);
  };
  const cancelLeave = () => {
    suspendCommits.current = false;
    setLeaving(false);
    blocker.reset?.();
    pendingInput.current?.focus({ preventScroll: true });
  };

  const finish = () => {
    (document.activeElement as HTMLElement | null)?.blur();
    onDone();
  };

  const locationField = score.fields.find((f) => f.id === locationFieldId);

  return (
    <NoteSpaceContext.Provider value={space}>
      <div className="detail-screen detail-edit" style={{ background: score.cardColor || undefined }}>
        <div className="detail-edit-head">
          <div className="detail-edit-head-row">
            <BackButton onClick={goBack} keepFocus />
            <button type="button" className="detail-edit-done" onClick={finish}>
              Listo
            </button>
          </div>
          <span className="t-section-label detail-edit-photos-label">Fotos</span>
          <PhotoGalleryEditor
            photos={score.photoUrls}
            onChange={(photoUrls) => saveScore({ photoUrls }, 'No se pudo actualizar la galería')}
            onError={setError}
            onOpenCoverSearch={() => setCoverOpen(true)}
          />
        </div>

        <div className="detail-content">
          <input
            className="detail-title-input"
            style={ink}
            value={score.title}
            onChange={(e) => setScore((s) => ({ ...s, title: e.target.value }))}
            onBlur={() => {
              const title = score.title.trim() || 'Sin título';
              if (title !== saved.current.title) saveScore({ title }, 'No se pudo actualizar el título');
              else if (title !== score.title) setScore((s) => ({ ...s, title }));
            }}
            aria-label="Título"
          />

          <div className="detail-edit-categories">
            <CategoryEditor
              categories={score.categories}
              suggestions={suggestions}
              onToggle={toggleCategory}
              onAddCustom={(c) => {
                if (!suggestions.includes(c)) setCustomCategories((prev) => [...prev, c]);
                if (!score.categories.includes(c)) toggleCategory(c);
              }}
            />
          </div>

          {!!error && (
            <p className="detail-error-banner" role="alert">
              {error}
            </p>
          )}

          {groups.length > 0 && score.canManage && (
            <div className="detail-people-section">
              <span className="t-section-label" style={sub}>
                Dónde
              </span>
              <div className="detail-space-row">
                <SpaceRow groups={groups} value={space} onChange={moveTo} label="Dónde" />
              </div>
            </div>
          )}

          <div className="detail-owner">
            <span className="t-section-label" style={sub}>
              Tu puntuación
            </span>
            <div className="detail-owner-edit">
              {mine && <ScoreBadge value={mine.value} size={40} />}
              <div className="detail-owner-pills">
                <NumberPillRow value={mine?.value ?? null} onSelect={rateMe} />
              </div>
            </div>
          </div>

          {members.length > 0 && (
            <div className="detail-people-section">
              <span className="t-section-label" style={sub}>
                Miembros
              </span>
              <div className="detail-people">
                {members.map((p) => (
                  <div key={p.id} className="detail-person">
                    <span className="detail-person-name" style={sub}>
                      {p.personName}
                    </span>
                    <ScoreBadge value={p.value} size={44} />
                    {p.formerMember && (
                      <span className="detail-person-former" style={sub}>
                        ex miembro
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="detail-people-section">
            <span className="t-section-label" style={sub}>
              Nota adicional
            </span>
            <PeopleScoresEditor
              people={others.map((r) => ({ id: r.id, name: r.personName, value: r.value }))}
              editingId={editingId}
              onStartEdit={(rid) => setEditingId((cur) => (cur === rid ? null : rid))}
              onSelectNumber={selectNumber}
              onRename={(rid, name) => setRatings((rs) => rs.map((r) => (r.id === rid ? { ...r, personName: name } : r)))}
              onRenameCommit={renameCommit}
              onRemove={removePerson}
              onAdd={addPerson}
              subColor={subColor}
            />
          </div>
        </div>

        <div className="detail-fields detail-fields-edit" ref={fieldsRef}>
          {score.fields.map((f, idx) => (
            <EditableFieldRow
              key={f.id}
              field={f}
              isFirst={idx === 0}
              isLast={idx === score.fields.length - 1}
              onChange={(patch) => setFields((fs) => fs.map((x) => (x.id === f.id ? { ...x, ...patch } : x)))}
              onCommit={(patch) => commitField(f.id, patch, 'label' in patch ? 'No se pudo renombrar el campo' : 'No se pudo guardar el campo')}
              onRemove={() => removeField(f.id)}
              onMove={(dir) => moveField(f.id, dir)}
              onPickLocation={() => setLocationFieldId(f.id)}
              onError={setError}
            />
          ))}
          <div className="quick-row detail-add-fields">
            {FIELD_DEFS.map((def) => (
              <button type="button" key={def.id} className="quick-chip on-bg" onClick={() => addField(def)}>
                <FieldIcon type={def.id} size="chip" />
                {def.label}
              </button>
            ))}
          </div>
        </div>

        <div className="detail-content">
          <CollapsibleSection title="Color de la card" subColor={subColor}>
            <ColorPicker value={score.cardColor} onChange={(cardColor) => saveScore({ cardColor }, 'No se pudo actualizar el color')} suggestedColor={suggestedColor} />
          </CollapsibleSection>
          <button
            type="button"
            className="template-save-as detail-save-template"
            onClick={() => {
              setTemplateNotice('');
              setSaveTemplateOpen(true);
            }}
          >
            Guardar como plantilla
          </button>
          {!!templateNotice && <p className="template-notice">{templateNotice}</p>}
        </div>

        <SaveTemplateSheet
          visible={saveTemplateOpen}
          onClose={() => setSaveTemplateOpen(false)}
          space={space}
          draft={{
            categories: score.categories,
            cardColor: score.cardColor,
            people: others.map((o) => o.personName.trim()).filter(Boolean),
            fields: score.fields.map((f) => ({ type: f.type, label: f.label, value: f.value })),
          }}
          onSaved={(t) => {
            setSaveTemplateOpen(false);
            setTemplateNotice(`Plantilla «${t.emoji} ${t.name}» guardada`);
          }}
        />

        <CoverPicker
          visible={coverOpen}
          onClose={() => setCoverOpen(false)}
          onPick={(url) => {
            saveScore({ photoUrls: [...score.photoUrls, url] }, 'No se pudo actualizar la galería');
            setCoverOpen(false);
          }}
        />

        <LocationPicker
          visible={!!locationField}
          initialValue={locationField ? asLocation(locationField.value) : null}
          onClose={() => setLocationFieldId(null)}
          onConfirm={(value) => {
            if (locationFieldId) {
              setFields((fs) => fs.map((x) => (x.id === locationFieldId ? { ...x, value } : x)));
              commitField(locationFieldId, { value }, 'No se pudo guardar el campo');
            }
            setLocationFieldId(null);
          }}
        />

        <Sheet visible={leaving} onClose={cancelLeave} label="¿Guardar los cambios?">
          <h2 className="sheet-title">¿Guardar los cambios?</h2>
          <p className="sheet-message">Tienes cambios sin confirmar en esta puntuación.</p>
          <div className="sheet-actions three">
            <button type="button" className="sheet-btn-text" onClick={cancelLeave}>
              Cancelar
            </button>
            <button type="button" className="sheet-btn-outline" onClick={discardAndLeave}>
              Descartar
            </button>
            <button type="button" className="sheet-btn-main" onClick={saveAndLeave}>
              Guardar
            </button>
          </div>
        </Sheet>
      </div>
    </NoteSpaceContext.Provider>
  );
}
