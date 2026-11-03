import type { FieldType, NoteTemplate } from '../api/types';

export interface TemplateTarget {
  fields: { id: string; type: FieldType; label: string; value: unknown }[];
  categories: string[];
  cardColor: string | null;
  people: { id: string; name: string; value: number }[];
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * A template added onto a note being written, without overwriting anything
 * (docs/plantillas.md): fields and people it doesn't have yet, the missing
 * categories, and the color only if none was chosen.
 */
export function applyTemplate(t: NoteTemplate, cur: TemplateTarget, newId: () => string): TemplateTarget {
  const fields = [...cur.fields];
  for (const f of t.fields) {
    if (fields.some((x) => x.type === f.type && same(x.label, f.label))) continue;
    // Its own copy: the editors change values in place.
    fields.push({ id: newId(), type: f.type, label: f.label, value: f.value == null ? f.value : structuredClone(f.value) });
  }
  const people = [...cur.people];
  for (const name of t.people) {
    if (!people.some((p) => same(p.name, name))) people.push({ id: newId(), name, value: 5 });
  }
  return {
    fields,
    categories: [...cur.categories, ...t.categories.filter((c) => !cur.categories.includes(c))],
    cardColor: cur.cardColor ?? t.cardColor,
    people,
  };
}
