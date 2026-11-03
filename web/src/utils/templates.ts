import type { FieldType, NoteTemplate } from '../api/types';

export interface TemplateTarget {
  fields: { id: string; type: FieldType; label: string; value: unknown }[];
  categories: string[];
  cardColor: string | null;
  people: { id: string; name: string; value: number }[];
}

/** What a template added to the note, so unmarking it can take it back out. */
export interface TemplateAdded {
  // Each field with its value as it came, to tell whether it was filled in.
  fields: { id: string; initial: string }[];
  categories: string[];
  people: string[];
  cardColor: string | null;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * A template added onto a note being written, without overwriting anything
 * (docs/plantillas.md): fields and people it doesn't have yet, the missing
 * categories, and the color only if none was chosen.
 */
export function applyTemplate(t: NoteTemplate, cur: TemplateTarget, newId: () => string): { next: TemplateTarget; added: TemplateAdded } {
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
  const newCategories = t.categories.filter((c) => !cur.categories.includes(c));
  const added: TemplateAdded = {
    fields: fields.slice(cur.fields.length).map((f) => ({ id: f.id, initial: JSON.stringify(f.value) })),
    categories: newCategories,
    people: people.slice(cur.people.length).map((p) => p.id),
    cardColor: cur.cardColor ? null : t.cardColor,
  };
  return { next: { fields, categories: [...cur.categories, ...newCategories], cardColor: cur.cardColor ?? t.cardColor, people }, added };
}

/** Whether something a template added was filled in: a field's value or a person's score. */
export function templateHasData(cur: TemplateTarget, added: TemplateAdded): boolean {
  return (
    added.fields.some((a) => {
      const f = cur.fields.find((x) => x.id === a.id);
      return !!f && JSON.stringify(f.value) !== a.initial;
    }) || cur.people.some((p) => added.people.includes(p.id) && p.value !== 5)
  );
}

/** The note without what a template added (what was changed by hand stays, like a color picked later). */
export function removeTemplate(cur: TemplateTarget, added: TemplateAdded): TemplateTarget {
  const fieldIds = new Set(added.fields.map((f) => f.id));
  return {
    fields: cur.fields.filter((f) => !fieldIds.has(f.id)),
    categories: cur.categories.filter((c) => !added.categories.includes(c)),
    cardColor: added.cardColor && cur.cardColor === added.cardColor ? null : cur.cardColor,
    people: cur.people.filter((p) => !added.people.includes(p.id)),
  };
}
