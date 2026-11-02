import { useEffect, useState } from 'react';
import Sheet from './Sheet';
import { MONTHS, formatDate, toIso } from '../utils/dates';
import './DateField.css';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function parse(iso: string | null) {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  return m ? { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) } : null;
}

function Calendar({ value, onChange }: { value: string | null; onChange: (iso: string) => void }) {
  const today = new Date();
  const picked = parse(value);
  const [view, setView] = useState(() => ({ y: picked?.y ?? today.getFullYear(), m: picked?.m ?? today.getMonth() }));

  const first = new Date(view.y, view.m, 1);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const step = (delta: number) => setView((v) => {
    const d = new Date(v.y, v.m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const years = Array.from({ length: today.getFullYear() + 10 - 1900 + 1 }, (_, i) => today.getFullYear() + 10 - i);

  return (
    <div className="calendar">
      <div className="calendar-head">
        <button type="button" className="calendar-nav" onClick={() => step(-1)} aria-label="Mes anterior">
          ‹
        </button>
        <div className="calendar-selects">
          <select aria-label="Mes" value={view.m} onChange={(e) => setView((v) => ({ ...v, m: Number(e.target.value) }))}>
            {MONTHS.map((name, i) => (
              <option key={name} value={i}>
                {name}
              </option>
            ))}
          </select>
          <select aria-label="Año" value={view.y} onChange={(e) => setView((v) => ({ ...v, y: Number(e.target.value) }))}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="calendar-nav" onClick={() => step(1)} aria-label="Mes siguiente">
          ›
        </button>
      </div>
      <div className="calendar-grid">
        {WEEKDAYS.map((w) => (
          <span key={w} className="calendar-weekday">
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span key={`e${i}`} />;
          const iso = toIso(view.y, view.m, d);
          const selected = picked && picked.y === view.y && picked.m === view.m && picked.d === d;
          const isToday = today.getFullYear() === view.y && today.getMonth() === view.m && today.getDate() === d;
          return (
            <button
              type="button"
              key={iso}
              className={`calendar-day${selected ? ' selected' : ''}${isToday ? ' today' : ''}`}
              onClick={() => onChange(iso)}
              aria-label={formatDate(iso) ?? iso}
              aria-pressed={!!selected}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  value: string | null;
  onChange: (iso: string | null) => void;
  /** Shown in the picker title ("Elegir fecha — Desde") when several sit side by side. */
  label?: string;
  className?: string;
}

// Values are plain 'YYYY-MM-DD' strings with no time zone. The picker opens
// as a sheet sliding up from the bottom, not a quick fade (the user asked
// for that explicitly).
export default function DateField({ value, onChange, label, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [calendarKey, setCalendarKey] = useState(0);
  useEffect(() => {
    if (open) setCalendarKey((k) => k + 1);
  }, [open]);

  return (
    <>
      <button type="button" className={`date-trigger${value ? '' : ' empty'} ${className}`} onClick={() => setOpen(true)} aria-label={label ? `Fecha ${label}` : undefined}>
        {value ? formatDate(value) : 'Toca para elegir una fecha'}
      </button>
      <Sheet visible={open} onClose={() => setOpen(false)} className="date-sheet" label="Elegir fecha">
        <h2 className="sheet-title">{label ? `Elegir fecha — ${label}` : 'Elegir fecha'}</h2>
        <Calendar key={calendarKey} value={value} onChange={onChange} />
        <button type="button" className="btn-primary date-done" onClick={() => setOpen(false)}>
          Listo
        </button>
      </Sheet>
    </>
  );
}
