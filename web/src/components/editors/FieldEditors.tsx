import { useAutoAnimate } from '@formkit/auto-animate/react';
import {
  CURRENCIES,
  DIFFICULTY_LABELS,
  asBoolean,
  asCriteria,
  asDifficulty,
  asDuration,
  asIngredients,
  asLink,
  asPrice,
  asSteps,
} from '../../utils/fields';
import AutoTextarea from './AutoTextarea';
import NumberPillRow from './NumberPillRow';

// Editors for the newer field types. Same contract as the rest of
// EditableFieldRow: onChange on every edit (local state), onCommit when it
// should be saved (on blur for typed text, right away for taps).
interface EditorProps {
  value: unknown;
  onChange: (v: unknown) => void;
  onCommit: (v: unknown) => void;
}

const digits = (s: string) => s.replace(/[^\d]/g, '');
const intOrNull = (s: string) => (digits(s) ? Number(digits(s)) : null);

function ToggleChips<T extends string | number | boolean>({ options, value, onPick }: { options: { value: T; label: string }[]; value: T | null; onPick: (v: T | null) => void }) {
  return (
    <div className="chip-wrap">
      {options.map((o) => (
        <button
          type="button"
          key={String(o.value)}
          className={`select-chip${value === o.value ? ' on' : ''}`}
          aria-pressed={value === o.value}
          onClick={() => onPick(value === o.value ? null : o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PriceEditor({ value, onChange, onCommit }: EditorProps) {
  const p = asPrice(value);
  const set = (patch: Partial<typeof p>, commit: boolean) => {
    const next = { ...p, ...patch };
    onChange(next);
    if (commit) onCommit(next);
  };
  return (
    <div className="fe-stack">
      <div className="fe-row">
        <input
          className="fe-input fe-amount"
          inputMode="decimal"
          placeholder="0,00"
          aria-label="Importe"
          value={p.amount}
          onChange={(e) => set({ amount: e.target.value.replace(/[^\d.,]/g, '') }, false)}
          onBlur={() => onCommit(p)}
        />
        <select className="fe-input fe-select" aria-label="Moneda" value={p.currency} onChange={(e) => set({ currency: e.target.value }, true)}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="fe-row">
        <ToggleChips
          options={[
            { value: 'person' as const, label: 'Por persona' },
            { value: 'total' as const, label: 'Total' },
          ]}
          value={p.per}
          onPick={(v) => set({ per: v ?? p.per }, true)}
        />
        {p.per === 'total' && (
          <input
            className="fe-input fe-small"
            inputMode="numeric"
            placeholder="Personas"
            aria-label="Personas"
            value={p.people ?? ''}
            onChange={(e) => set({ people: intOrNull(e.target.value) }, false)}
            onBlur={() => onCommit(p)}
          />
        )}
      </div>
    </div>
  );
}

export function CriteriaEditor({ value, onChange, onCommit }: EditorProps) {
  const list = asCriteria(value);
  const [ref] = useAutoAnimate<HTMLDivElement>();
  const update = (idx: number, patch: Partial<(typeof list)[number]>, commit: boolean) => {
    const next = list.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    onChange(next);
    if (commit) onCommit(next);
  };
  const remove = (idx: number) => {
    const next = list.filter((_, i) => i !== idx);
    onChange(next);
    onCommit(next);
  };
  return (
    <div className="fe-stack" ref={ref}>
      {list.map((c, idx) => (
        <div key={idx} className="fe-criterion">
          <div className="fe-criterion-head">
            <input
              className="field-input"
              placeholder="Criterio, p. ej. Sabor"
              aria-label="Nombre del criterio"
              value={c.name}
              onChange={(e) => update(idx, { name: e.target.value }, false)}
              onBlur={() => onCommit(list)}
            />
            <button type="button" className="field-remove" onClick={() => remove(idx)} aria-label={`Quitar criterio ${c.name || idx + 1}`}>
              ✕
            </button>
          </div>
          <NumberPillRow value={c.value} onSelect={(n) => update(idx, { value: n }, true)} />
        </div>
      ))}
      <button type="button" className="link-btn" onClick={() => onChange([...list, { name: '', value: null }])}>
        + Añadir criterio
      </button>
    </div>
  );
}

export function DurationEditor({ value, onChange, onCommit }: EditorProps) {
  const total = asDuration(value);
  const h = total ? Math.floor(total / 60) : null;
  const m = total ? total % 60 : null;
  const compose = (hh: number | null, mm: number | null) => {
    const minutes = (hh ?? 0) * 60 + (mm ?? 0);
    return minutes > 0 ? minutes : null;
  };
  return (
    <div className="fe-row">
      <label className="fe-unit">
        <input
          className="fe-input fe-small"
          inputMode="numeric"
          placeholder="0"
          aria-label="Horas"
          value={h ?? ''}
          onChange={(e) => onChange(compose(intOrNull(e.target.value), m))}
          onBlur={() => onCommit(total)}
        />
        <span>h</span>
      </label>
      <label className="fe-unit">
        <input
          className="fe-input fe-small"
          inputMode="numeric"
          placeholder="0"
          aria-label="Minutos"
          value={m ?? ''}
          onChange={(e) => onChange(compose(h, intOrNull(e.target.value)))}
          onBlur={() => onCommit(total)}
        />
        <span>min</span>
      </label>
    </div>
  );
}

export function LinkEditor({ value, onChange, onCommit }: EditorProps) {
  const l = asLink(value);
  return (
    <div className="fe-stack">
      <input
        className="field-input"
        type="url"
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        placeholder="https://..."
        aria-label="Dirección del enlace"
        value={l.url}
        onChange={(e) => onChange({ ...l, url: e.target.value })}
        onBlur={() => onCommit(l)}
      />
      <input
        className="field-input"
        placeholder="Título (opcional)"
        aria-label="Título del enlace"
        value={l.title}
        onChange={(e) => onChange({ ...l, title: e.target.value })}
        onBlur={() => onCommit(l)}
      />
    </div>
  );
}

export function BooleanEditor({ value, onChange, onCommit }: EditorProps) {
  return (
    <ToggleChips
      options={[
        { value: true, label: 'Sí' },
        { value: false, label: 'No' },
      ]}
      value={asBoolean(value)}
      onPick={(v) => {
        onChange(v);
        onCommit(v);
      }}
    />
  );
}

export function DifficultyEditor({ value, onChange, onCommit }: EditorProps) {
  return (
    <ToggleChips
      options={DIFFICULTY_LABELS.map((label, i) => ({ value: (i + 1) as 1 | 2 | 3, label }))}
      value={asDifficulty(value)}
      onPick={(v) => {
        onChange(v);
        onCommit(v);
      }}
    />
  );
}

export function IngredientsEditor({ value, onChange, onCommit }: EditorProps) {
  const ing = asIngredients(value);
  const [ref] = useAutoAnimate<HTMLDivElement>();
  const setItems = (items: typeof ing.items, commit: boolean) => {
    const next = { ...ing, items };
    onChange(next);
    if (commit) onCommit(next);
  };
  const updateItem = (idx: number, patch: Partial<(typeof ing.items)[number]>) => setItems(ing.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)), false);
  return (
    <div className="fe-stack">
      <label className="fe-unit">
        <span>Raciones</span>
        <input
          className="fe-input fe-small"
          inputMode="numeric"
          placeholder="4"
          aria-label="Raciones"
          value={ing.servings ?? ''}
          onChange={(e) => onChange({ ...ing, servings: intOrNull(e.target.value) })}
          onBlur={() => onCommit(ing)}
        />
      </label>
      <div className="fe-stack" ref={ref}>
        {ing.items.map((it, idx) => (
          <div key={idx} className="fe-row fe-ingredient">
            <input className="fe-input fe-qty" placeholder="200" aria-label="Cantidad" value={it.qty} onChange={(e) => updateItem(idx, { qty: e.target.value })} onBlur={() => onCommit(ing)} />
            <input className="fe-input fe-qty" placeholder="g" aria-label="Unidad" value={it.unit} onChange={(e) => updateItem(idx, { unit: e.target.value })} onBlur={() => onCommit(ing)} />
            <input className="fe-input fe-grow" placeholder="Ingrediente" aria-label="Ingrediente" value={it.name} onChange={(e) => updateItem(idx, { name: e.target.value })} onBlur={() => onCommit(ing)} />
            <button
              type="button"
              className="field-remove"
              onClick={() => setItems(ing.items.filter((_, i) => i !== idx), true)}
              aria-label={`Quitar ingrediente ${it.name || idx + 1}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="link-btn" onClick={() => setItems([...ing.items, { qty: '', unit: '', name: '' }], false)}>
        + Añadir ingrediente
      </button>
    </div>
  );
}

export function StepsEditor({ value, onChange, onCommit }: EditorProps) {
  const steps = asSteps(value);
  const [ref] = useAutoAnimate<HTMLDivElement>();
  return (
    <div className="fe-stack" ref={ref}>
      {steps.map((s, idx) => (
        <div key={idx} className="fe-step">
          <span className="fe-step-num">{idx + 1}.</span>
          <AutoTextarea
            className="field-input field-textarea"
            placeholder="Describe el paso..."
            value={s}
            onChange={(v) => onChange(steps.map((x, i) => (i === idx ? v : x)))}
            onBlur={() => onCommit(steps)}
          />
          <button
            type="button"
            className="field-remove"
            onClick={() => {
              const next = steps.filter((_, i) => i !== idx);
              onChange(next);
              onCommit(next);
            }}
            aria-label={`Quitar paso ${idx + 1}`}
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="link-btn" onClick={() => onChange([...steps, ''])}>
        + Añadir paso
      </button>
    </div>
  );
}
