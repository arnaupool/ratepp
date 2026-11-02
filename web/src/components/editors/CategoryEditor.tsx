import { useState } from 'react';

interface Props {
  categories: string[];
  suggestions: string[];
  onToggle: (c: string) => void;
  onAddCustom: (c: string) => void;
}

// Selected categories always show as chips; the rest of the suggestions stay
// behind the chevron until it is tapped.
export default function CategoryEditor({ categories, suggestions, onToggle, onAddCustom }: Props) {
  const [draft, setDraft] = useState('');
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? suggestions : suggestions.filter((c) => categories.includes(c));

  const submit = () => {
    const c = draft.trim();
    if (!c) return;
    onAddCustom(c);
    setDraft('');
  };

  return (
    <div className="category-editor">
      <div className="category-editor-row">
        <input
          className="editor-input"
          placeholder="Escribe y pulsa enter para añadir..."
          enterKeyHint="done"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          type="button"
          className="category-editor-chevron"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Ocultar categorías' : 'Ver todas las categorías'}
        >
          {expanded ? '▴' : '▾'}
        </button>
      </div>
      {visible.length > 0 && (
        <div className="chip-wrap">
          {visible.map((c) => {
            const on = categories.includes(c);
            return (
              <button type="button" key={c} className={`select-chip${on ? ' on' : ''}`} onClick={() => onToggle(c)} aria-pressed={on}>
                {c}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
