import type { NoteTemplate } from '../../api/types';
import './templates.css';

interface Props {
  templates: NoteTemplate[];
  value: string;
  onPick: (template: NoteTemplate | null) => void;
  subColor?: string;
}

// "Plantilla" at the top of Nueva puntuación: a row of cards to swipe, yours
// first and then each group's. A tap applies one and marks it; tapping the
// marked one only unmarks it (what it added stays). Hidden until there is
// at least one.
export default function TemplatePicker({ templates, value, onPick, subColor }: Props) {
  if (templates.length === 0) return null;
  const ordered = [...templates.filter((t) => !t.groupId), ...templates.filter((t) => t.groupId)];
  return (
    <section className="editor-section template-picker">
      <span className="t-section-label" style={subColor ? { color: subColor } : undefined}>
        Plantilla
      </span>
      <div className="template-cards no-scrollbar" role="group" aria-label="Plantillas">
        {ordered.map((t) => {
          const on = t.id === value;
          return (
            <button
              key={t.id}
              type="button"
              className={`template-card${on ? ' on' : ''}`}
              aria-pressed={on}
              aria-label={`Plantilla ${t.name}`}
              onClick={() => onPick(on ? null : t)}
            >
              <span className="template-card-emoji" aria-hidden>
                {t.emoji}
              </span>
              <span className="template-card-name">{t.name}</span>
              {t.groupName && <span className="template-card-group">👥 {t.groupName}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
