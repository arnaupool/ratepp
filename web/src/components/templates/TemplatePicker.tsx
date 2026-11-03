import type { NoteTemplate } from '../../api/types';
import './templates.css';

interface Props {
  templates: NoteTemplate[];
  value: string;
  onPick: (template: NoteTemplate | null) => void;
  subColor?: string;
}

// "Plantilla" dropdown at the top of Nueva puntuación: yours, then each
// group's. Hidden until there is at least one.
export default function TemplatePicker({ templates, value, onPick, subColor }: Props) {
  if (templates.length === 0) return null;
  const mine = templates.filter((t) => !t.groupId);
  const groups = [...new Map(templates.filter((t) => t.groupId).map((t) => [t.groupId, t.groupName ?? 'Grupo'])).entries()];
  return (
    <label className="editor-section template-picker">
      <span className="t-section-label" style={subColor ? { color: subColor } : undefined}>
        Plantilla
      </span>
      <select
        className="editor-input template-select"
        value={value}
        onChange={(e) => onPick(templates.find((t) => t.id === e.target.value) ?? null)}
        aria-label="Plantilla"
      >
        <option value="">Sin plantilla</option>
        {mine.length > 0 && (
          <optgroup label="Mías">
            {mine.map((t) => (
              <option key={t.id} value={t.id}>
                {t.emoji} {t.name}
              </option>
            ))}
          </optgroup>
        )}
        {groups.map(([groupId, groupName]) => (
          <optgroup key={groupId} label={`👥 ${groupName}`}>
            {templates
              .filter((t) => t.groupId === groupId)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.emoji} {t.name}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
