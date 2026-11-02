import type { Field } from '../api/types';
import { asLocation, asStringArray, asText } from '../constants/fieldDefs';
import { formatDate } from '../utils/dates';
import { FieldIconTile } from './FieldIcon';
import MapPreview from './MapPreview';
import { Photo, TagChip } from './bits';

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
