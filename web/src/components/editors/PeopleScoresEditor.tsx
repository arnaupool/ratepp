import { ScoreBadge } from '../bits';
import NumberPillRow from './NumberPillRow';

export interface PersonScore {
  id: string;
  name: string;
  value: number;
}

interface Props {
  people: PersonScore[];
  editingId: string | null;
  onStartEdit: (id: string) => void;
  onSelectNumber: (id: string, n: number) => void;
  onRename: (id: string, name: string) => void;
  onRenameCommit?: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  subColor?: string;
}

// "Nota adicional": each person has an inline-editable name over a score
// badge; tapping the badge opens a shared 1-10 row for that person.
export default function PeopleScoresEditor({ people, editingId, onStartEdit, onSelectNumber, onRename, onRenameCommit, onRemove, onAdd, subColor }: Props) {
  const editing = people.find((p) => p.id === editingId);
  const sub = subColor ? { color: subColor } : undefined;
  return (
    <div>
      <div className="people-row">
        {people.map((p) => (
          <div key={p.id} className="people-person">
            <div className="people-name-row">
              <input
                className="people-name-input"
                style={sub}
                value={p.name}
                onChange={(e) => onRename(p.id, e.target.value)}
                onBlur={() => onRenameCommit?.(p.id)}
                aria-label="Nombre de la persona"
              />
              <button type="button" className="people-remove" style={sub} onClick={() => onRemove(p.id)} aria-label="Quitar persona">
                ✕
              </button>
            </div>
            <ScoreBadge value={p.value} size={44} onClick={() => onStartEdit(p.id)} label={`Puntuación de ${p.name}`} />
          </div>
        ))}
        <div className="people-person">
          <button type="button" className="people-add" style={sub} onClick={onAdd} aria-label="Añadir persona">
            +
          </button>
          <span className="people-add-label" style={sub}>
            Añadir
          </span>
        </div>
      </div>
      {editing && (
        <div className="people-editing">
          <span className="people-editing-label" style={sub}>
            Editando puntuación de {editing.name}
          </span>
          <div className="people-editing-pills">
            <NumberPillRow value={editing.value} onSelect={(n) => onSelectNumber(editing.id, n)} />
          </div>
        </div>
      )}
    </div>
  );
}
