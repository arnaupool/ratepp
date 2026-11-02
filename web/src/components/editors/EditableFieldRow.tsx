import { useState } from 'react';
import type { Field } from '../../api/types';
import { asLocation, asStringArray, asText, fieldDef } from '../../constants/fieldDefs';
import { errorMessage } from '../../api/client';
import { pickImageFile, uploadImageFile } from '../../utils/upload';
import DateField from '../DateField';
import { FieldIconTile } from '../FieldIcon';
import MapPreview from '../MapPreview';
import { Photo, Spinner } from '../bits';
import TagAutocomplete from './TagAutocomplete';
import AutoTextarea from './AutoTextarea';

export type EditableField = Pick<Field, 'id' | 'type' | 'label' | 'value'>;

interface Props {
  field: EditableField;
  isFirst: boolean;
  isLast: boolean;
  /** Every change, for local state. */
  onChange: (patch: Partial<EditableField>) => void;
  /**
   * When the change should be persisted: right away for date, location,
   * tags and photos; on blur for typed text (no request per keystroke).
   * Create ignores it; Detalle's edit mode saves.
   */
  onCommit: (patch: Partial<EditableField>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onPickLocation: () => void;
  onError: (message: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
}

// One editable dynamic field, shared by Crear and Detalle's edit mode.
export default function EditableFieldRow({ field, isFirst, isLast, onChange, onCommit, onRemove, onMove, onPickLocation, onError, onUploadingChange }: Props) {
  const def = fieldDef(field.type);
  const [uploading, setUploading] = useState(false);
  if (!def) return null;

  const setValue = (value: unknown, commit: boolean) => {
    onChange({ value });
    if (commit) onCommit({ value });
  };

  const addPhoto = async () => {
    const file = await pickImageFile();
    if (!file) return;
    setUploading(true);
    onUploadingChange?.(true);
    try {
      const url = await uploadImageFile(file);
      setValue([...asStringArray(field.value), url], true);
    } catch (e) {
      onError(errorMessage(e, 'No se pudo subir la foto'));
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  };

  const listItems = Array.isArray(field.value) ? (field.value as unknown[]).map((v) => (typeof v === 'string' ? v : '')) : [''];
  const location = asLocation(field.value);

  return (
    <div className="field-row">
      <div className="field-head">
        <FieldIconTile type={field.type} />
        <input
          className="field-label-input"
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          onBlur={() => onCommit({ label: field.label })}
          aria-label={`Etiqueta del campo ${field.label}`}
        />
        <div className="field-actions">
          <button type="button" className="field-move" disabled={isFirst} onClick={() => onMove(-1)} aria-label={`Mover ${field.label} arriba`}>
            ▲
          </button>
          <button type="button" className="field-move" disabled={isLast} onClick={() => onMove(1)} aria-label={`Mover ${field.label} abajo`}>
            ▼
          </button>
          <button type="button" className="field-remove" onClick={onRemove} aria-label={`Quitar campo ${field.label}`}>
            ✕
          </button>
        </div>
      </div>

      {def.kind === 'simple' && field.type === 'text_long' && (
        <AutoTextarea
          className="field-input field-textarea"
          placeholder={def.placeholder}
          value={asText(field.value)}
          onChange={(v) => onChange({ value: v })}
          onBlur={() => onCommit({ value: asText(field.value) })}
        />
      )}

      {def.kind === 'simple' && field.type !== 'text_long' && (
        <input
          className="field-input"
          placeholder={def.placeholder}
          inputMode={def.numeric ? 'decimal' : undefined}
          value={asText(field.value)}
          onChange={(e) => onChange({ value: e.target.value })}
          onBlur={() => onCommit({ value: asText(field.value) })}
        />
      )}

      {def.kind === 'date' && <DateField value={typeof field.value === 'string' ? field.value : null} onChange={(v) => setValue(v, true)} />}

      {def.kind === 'tag' && <TagAutocomplete value={field.value} onChange={(v) => setValue(v, true)} />}

      {def.kind === 'location' &&
        (location && (location.label || location.lat != null) ? (
          <button type="button" className="field-location-preview" onClick={onPickLocation} aria-label="Cambiar ubicación">
            <MapPreview value={location} height={120} interactive={false} />
          </button>
        ) : (
          <button type="button" className="field-location-btn" onClick={onPickLocation}>
            📍 Elegir ubicación en el mapa
          </button>
        ))}

      {def.kind === 'list' && (
        <div className="field-list">
          {listItems.map((item, idx) => (
            <input
              key={idx}
              className="field-input"
              placeholder="Añade un ítem..."
              value={item}
              onChange={(e) => {
                const next = listItems.slice();
                next[idx] = e.target.value;
                onChange({ value: next });
              }}
              onBlur={() => onCommit({ value: listItems })}
            />
          ))}
          <button type="button" className="link-btn" onClick={() => onChange({ value: [...listItems, ''] })}>
            + Añadir ítem
          </button>
        </div>
      )}

      {def.kind === 'gallery' && (
        <div className="field-gallery">
          {asStringArray(field.value).map((url, idx) => (
            <div key={`${url}-${idx}`} className="field-gallery-item">
              <Photo url={url} thumb sizes="120px" />
              <button
                type="button"
                className="gallery-editor-remove"
                onClick={() => setValue(asStringArray(field.value).filter((_, i) => i !== idx), true)}
                aria-label="Quitar foto"
              >
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="field-gallery-item field-gallery-add" onClick={addPhoto} disabled={uploading} aria-label="Añadir foto">
            {uploading ? <Spinner small label="Subiendo foto" /> : '+'}
          </button>
        </div>
      )}
    </div>
  );
}
