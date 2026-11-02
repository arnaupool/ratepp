// Value shapes of the field types added after the Expo app (stored as JSON
// in score_fields.value), with readers that tolerate anything (a malformed
// row must never break a screen) and the formatters used in Detalle.

export interface PriceValue {
  /** As typed ("24,50"), so a half-typed decimal isn't lost. */
  amount: string;
  currency: string;
  per: 'person' | 'total';
  /** Only meaningful for a total: splits it per person. */
  people: number | null;
}

export interface Criterion {
  name: string;
  value: number | null;
}

export interface LinkValue {
  url: string;
  title: string;
}

export interface Ingredient {
  qty: string;
  unit: string;
  name: string;
}

export interface IngredientsValue {
  servings: number | null;
  items: Ingredient[];
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
const posInt = (v: unknown) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'MXN'];

export function asPrice(v: unknown): PriceValue {
  const o = obj(v);
  return {
    amount: str(o.amount),
    currency: typeof o.currency === 'string' && o.currency ? o.currency : 'EUR',
    per: o.per === 'total' ? 'total' : 'person',
    people: posInt(o.people),
  };
}

export function asCriteria(v: unknown): Criterion[] {
  if (!Array.isArray(v)) return [];
  return v.map((c) => {
    const o = obj(c);
    const n = typeof o.value === 'number' && o.value >= 1 && o.value <= 10 ? Math.round(o.value) : null;
    return { name: str(o.name), value: n };
  });
}

/** Minutes, or null. */
export function asDuration(v: unknown): number | null {
  const n = typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export function asLink(v: unknown): LinkValue {
  const o = obj(v);
  return { url: str(o.url), title: str(o.title) };
}

export function asBoolean(v: unknown): boolean | null {
  return typeof v === 'boolean' ? v : null;
}

export function asIngredients(v: unknown): IngredientsValue {
  const o = obj(v);
  const items = Array.isArray(o.items) ? o.items.map((i) => ({ qty: str(obj(i).qty), unit: str(obj(i).unit), name: str(obj(i).name) })) : [];
  return { servings: posInt(o.servings), items };
}

export function asSteps(v: unknown): string[] {
  return Array.isArray(v) ? v.map(str) : typeof v === 'string' && v ? [v] : [];
}

export function asDifficulty(v: unknown): 1 | 2 | 3 | null {
  return v === 1 || v === 2 || v === 3 ? v : null;
}

export const DIFFICULTY_LABELS = ['Fácil', 'Media', 'Difícil'] as const;

// ---- formatting ----

/** "24,50" / "24.50" / "1.234,5" -> 24.5 / 1234.5; null if not a number. */
export function parseAmount(raw: string): number | null {
  let s = raw.trim().replace(/\s/g, '');
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function formatMoney(n: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

/** Lines shown in Detalle for a price, or [] when empty. */
export function describePrice(p: PriceValue): string[] {
  const n = parseAmount(p.amount);
  if (n === null) return [];
  if (p.per === 'person') return [`${formatMoney(n, p.currency)} por persona`];
  const lines = [`${formatMoney(n, p.currency)} en total`];
  if (p.people && p.people > 1) lines.push(`${formatMoney(n / p.people, p.currency)} por persona (${p.people} personas)`);
  return lines;
}

export function formatDuration(minutes: number | null) {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/**
 * Only http(s) links are ever rendered as links (a stored "javascript:" URL
 * must never become clickable). A bare "example.com" gets https://.
 */
export function safeUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : /^[^\s/]+\.[^\s/]+/.test(s) ? `https://${s}` : s;
  try {
    const u = new URL(withScheme);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

/** "1/2", "1 1/2", "0,5", "200" -> number; null when it isn't one ("al gusto"). */
export function parseQty(raw: string): number | null {
  const s = raw.trim().replace(',', '.');
  if (!s) return null;
  const mixed = /^(\d+)\s+(\d+)\/(\d+)$/.exec(s);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = /^(\d+)\/(\d+)$/.exec(s);
  if (frac) return Number(frac[2]) ? Number(frac[1]) / Number(frac[2]) : null;
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}

export function formatQty(n: number) {
  const rounded = Math.round(n * 100) / 100;
  return rounded.toLocaleString('es-ES', { maximumFractionDigits: 2 });
}

/** Quantity for `servings` people when the recipe is written for `base`. */
export function scaleQty(raw: string, base: number | null, servings: number | null) {
  const n = parseQty(raw);
  if (n === null || !base || !servings || base === servings) return raw.trim();
  return formatQty((n * servings) / base);
}
