import { useState } from 'react';
import type { Field } from '../api/types';
import { asLocation, asStringArray, asText } from '../constants/fieldDefs';
import { formatDate } from '../utils/dates';
import {
  DIFFICULTY_LABELS,
  asBoolean,
  asCriteria,
  asDifficulty,
  asDuration,
  asIngredients,
  asLink,
  asPrice,
  asSteps,
  describePrice,
  formatDuration,
  safeUrl,
  scaleQty,
  type IngredientsValue,
} from '../utils/fields';
import { FieldIconTile } from './FieldIcon';
import MapPreview from './MapPreview';
import { Photo, ScoreBadge, TagChip } from './bits';

// One read-only field in Detalle's fields card. Values are rendered as plain
// text, never as HTML.
export default function DetailFieldRow({ field, onPhoto }: { field: Field; onPhoto: (url: string) => void }) {
  return (
    <div className="detail-field">
      <div className="detail-field-head">
        <FieldIconTile type={field.type} small />
        <span className="detail-field-label">{field.label}</span>
      </div>
      <FieldValue field={field} onPhoto={onPhoto} />
    </div>
  );
}

function FieldValue({ field, onPhoto }: { field: Field; onPhoto: (url: string) => void }) {
  switch (field.type) {
    case 'price': {
      const lines = describePrice(asPrice(field.value));
      if (!lines.length) return null;
      return (
        <div className="detail-field-value">
          <div className="detail-field-text">{lines[0]}</div>
          {lines[1] && <div className="detail-field-sub">{lines[1]}</div>}
        </div>
      );
    }
    case 'criteria': {
      const list = asCriteria(field.value).filter((c) => c.name.trim() || c.value);
      if (!list.length) return null;
      const rated = list.filter((c) => c.value);
      const avg = rated.length > 1 ? rated.reduce((t, c) => t + (c.value ?? 0), 0) / rated.length : null;
      return (
        <div className="detail-field-value detail-criteria">
          {list.map((c, i) => (
            <div key={i} className="detail-criterion">
              <span className="detail-field-text">{c.name || '—'}</span>
              {c.value ? <ScoreBadge value={c.value} size={30} /> : null}
            </div>
          ))}
          {avg !== null && <div className="detail-field-sub">Media: {avg.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</div>}
        </div>
      );
    }
    case 'duration': {
      const text = formatDuration(asDuration(field.value));
      return text ? <div className="detail-field-value detail-field-text">{text}</div> : null;
    }
    case 'link': {
      const l = asLink(field.value);
      const href = safeUrl(l.url);
      if (!l.url.trim()) return null;
      if (!href) return <div className="detail-field-value detail-field-text">{l.title || l.url}</div>;
      return (
        <div className="detail-field-value">
          <a className="detail-link" href={href} target="_blank" rel="noopener noreferrer">
            {l.title.trim() || new URL(href).hostname.replace(/^www\./, '')} ↗
          </a>
        </div>
      );
    }
    case 'boolean': {
      const b = asBoolean(field.value);
      if (b === null) return null;
      return (
        <div className="detail-field-value">
          <span className={`detail-yesno${b ? ' yes' : ''}`}>{b ? 'Sí' : 'No'}</span>
        </div>
      );
    }
    case 'difficulty': {
      const d = asDifficulty(field.value);
      if (!d) return null;
      return (
        <div className="detail-field-value detail-difficulty">
          <span className="detail-difficulty-bars" aria-hidden="true">
            {[1, 2, 3].map((n) => (
              <span key={n} className={n <= d ? 'on' : ''} />
            ))}
          </span>
          <span className="detail-field-text">{DIFFICULTY_LABELS[d - 1]}</span>
        </div>
      );
    }
    case 'ingredients': {
      const ing = asIngredients(field.value);
      if (!ing.items.some((i) => i.name.trim() || i.qty.trim())) return null;
      return <IngredientsView ing={ing} />;
    }
    case 'steps': {
      const steps = asSteps(field.value).filter((s) => s.trim());
      if (!steps.length) return null;
      return (
        <ol className="detail-field-value detail-steps">
          {steps.map((s, i) => (
            <li key={i} className="detail-field-text">
              {s}
            </li>
          ))}
        </ol>
      );
    }
    case 'list': {
      const items = asStringArray(field.value).filter(Boolean);
      if (!items.length) return null;
      return (
        <div className="detail-field-value">
          {items.map((item, i) => (
            <div key={i} className="detail-field-text">
              — {item}
            </div>
          ))}
        </div>
      );
    }
    case 'gallery':
    case 'photo': {
      // Legacy 'photo' rows hold one URL: shown as a gallery of one.
      const urls = asStringArray(field.value);
      if (!urls.length) return null;
      return (
        <div className="detail-field-value detail-field-gallery no-scrollbar">
          {urls.map((url, i) => (
            <button type="button" key={`${url}-${i}`} className="detail-field-thumb" onClick={() => onPhoto(url)} aria-label="Ver foto">
              <Photo url={url} thumb sizes="70px" />
            </button>
          ))}
        </div>
      );
    }
    case 'date': {
      const text = formatDate(field.value);
      return text ? <div className="detail-field-value detail-field-text">{text}</div> : null;
    }
    case 'location': {
      const loc = asLocation(field.value);
      if (!loc || (!loc.label && loc.lat == null)) return null;
      return (
        <div className="detail-field-value">
          <MapPreview value={loc} height={140} />
        </div>
      );
    }
    case 'tag': {
      const tags = asStringArray(field.value);
      if (!tags.length) return null;
      return (
        <div className="detail-field-value detail-field-tags">
          {tags.map((t) => (
            <TagChip key={t} label={t} />
          ))}
        </div>
      );
    }
    default: {
      const text = asText(field.value);
      return text ? <div className="detail-field-value detail-field-text">{text}</div> : null;
    }
  }
}

// Quantities rescale for a different number of servings (view only; the
// recipe itself isn't changed).
function IngredientsView({ ing }: { ing: IngredientsValue }) {
  const [servings, setServings] = useState(ing.servings);
  const items = ing.items.filter((i) => i.name.trim() || i.qty.trim());
  return (
    <div className="detail-field-value detail-ingredients">
      {ing.servings && servings && (
        <div className="detail-servings">
          <button type="button" onClick={() => setServings((s) => Math.max(1, (s ?? 1) - 1))} aria-label="Menos raciones" disabled={servings <= 1}>
            −
          </button>
          <span>
            Para {servings} {servings === 1 ? 'ración' : 'raciones'}
          </span>
          <button type="button" onClick={() => setServings((s) => (s ?? 0) + 1)} aria-label="Más raciones">
            +
          </button>
        </div>
      )}
      <ul>
        {items.map((it, i) => (
          <li key={i} className="detail-field-text">
            <span className="detail-qty">{[scaleQty(it.qty, ing.servings, servings), it.unit.trim()].filter(Boolean).join(' ')}</span>
            {it.qty.trim() || it.unit.trim() ? ' ' : ''}
            {it.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
