import type { GroupSummary } from '../api/types';
import { FilterChip } from './bits';
import './SpaceRow.css';

interface Props {
  groups: GroupSummary[];
  value: string;
  onChange: (space: string) => void;
  /** Offer "Todo" (personal + every group): Principal and the map. */
  withAll?: boolean;
  label?: string;
}

// Where notes come from or go to: "Todo · Solo yo · <groups>". Hidden for
// someone in no group, so the app looks exactly as before for them.
export default function SpaceRow({ groups, value, onChange, withAll = false, label }: Props) {
  if (groups.length === 0) return null;
  const options = [...(withAll ? [{ id: 'all', name: 'Todo' }] : []), { id: 'me', name: 'Solo yo' }, ...groups.map((g) => ({ id: g.id, name: g.name }))];
  return (
    <div className="space-row no-scrollbar" role="group" aria-label={label ?? 'Espacio'}>
      {options.map((o) => (
        <FilterChip key={o.id} label={o.id === 'all' || o.id === 'me' ? o.name : `👥 ${o.name}`} active={value === o.id} onClick={() => onChange(o.id)} />
      ))}
    </div>
  );
}
