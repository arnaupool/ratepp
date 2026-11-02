import type { Dispatch, SetStateAction } from 'react';
import type { ScoreDetail } from '../api/types';

// Replaced by the full edit mode in phase 5.
export default function DetailEditMode({ onDone }: { score: ScoreDetail; setScore: Dispatch<SetStateAction<ScoreDetail>>; onDone: () => void }) {
  return (
    <div className="screen">
      <button type="button" className="btn-primary" onClick={onDone}>
        Listo
      </button>
    </div>
  );
}
