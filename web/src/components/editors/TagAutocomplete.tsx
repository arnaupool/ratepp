import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tagsApi } from '../../api/endpoints';
import { asStringArray } from '../../constants/fieldDefs';

// Tag field editor: chips for the tags already added, a free-text input, and
// a collapsed list of previously used tags to add with one tap.
export default function TagAutocomplete({ value, onChange }: { value: unknown; onChange: (tags: string[]) => void }) {
  const tags = asStringArray(value);
  const [draft, setDraft] = useState('');
  const [expanded, setExpanded] = useState(false);
  const { data } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });
  const suggestions = (data?.tags ?? []).filter((t) => !tags.includes(t));

  const add = (t: string) => {
    const clean = t.trim();
    if (!clean || tags.includes(clean)) return;
    onChange([...tags, clean]);
  };

  return (
    <div className="tag-editor">
      {tags.length > 0 && (
        <div className="chip-wrap tight">
          {tags.map((t) => (
            <span key={t} className="tag-selected">
              {t}
              <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} aria-label={`Quitar etiqueta ${t}`}>
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        className="field-input"
        placeholder="Escribe una etiqueta y pulsa enter..."
        enterKeyHint="done"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add(draft);
            setDraft('');
          }
        }}
      />
      {suggestions.length > 0 && (
        <button type="button" className="link-btn" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Ocultar etiquetas usadas' : 'Ver etiquetas usadas anteriormente'} {expanded ? '▴' : '▾'}
        </button>
      )}
      {expanded && suggestions.length > 0 && (
        <div className="chip-wrap tight">
          {suggestions.map((t) => (
            <button type="button" key={t} className="tag-suggestion" onClick={() => add(t)}>
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
