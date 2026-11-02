import { NUMBERS } from '../../constants/fieldDefs';
import { scoreColor } from '../../utils/colors';

// 1-10 in a single row (never wrapping: the user didn't want 9 and 10 apart).
export default function NumberPillRow({ value, onSelect }: { value: number | null | undefined; onSelect: (n: number) => void }) {
  return (
    <div className="num-pills" role="radiogroup">
      {NUMBERS.map((n) => {
        const on = value === n;
        return (
          <button
            type="button"
            key={n}
            role="radio"
            aria-checked={on}
            className={`num-pill${on ? ' on' : ''}`}
            style={on ? { background: scoreColor(n), borderColor: scoreColor(n) } : undefined}
            onClick={() => onSelect(n)}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
