import './templates.css';

const EMOJIS = [
  '🍽️', '🍕', '🍔', '🍣', '🍜', '🥘', '🥗', '🍰', '🧁', '☕',
  '🍷', '🍺', '🍸', '🍳', '📖', '🎬', '📺', '🎮', '📚', '🎵',
  '🎭', '🎨', '🏛️', '🏨', '✈️', '🏖️', '⛰️', '🚗', '🏃', '⚽',
  '🛍️', '💄', '🎁', '💻', '📱', '🐶', '🌿', '⭐', '❤️', '🎉',
];

// A grid of common ones plus "Otro", where any emoji can be typed (the
// iPhone's emoji keyboard).
export default function EmojiPicker({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  const custom = value && !EMOJIS.includes(value) ? value : '';
  return (
    <div className="emoji-picker">
      <div className="emoji-grid" role="radiogroup" aria-label="Emoticono">
        {EMOJIS.map((e) => (
          <button key={e} type="button" role="radio" aria-checked={value === e} aria-label={e} className={`emoji-cell${value === e ? ' on' : ''}`} onClick={() => onChange(e)}>
            {e}
          </button>
        ))}
      </div>
      <input
        className="editor-input emoji-other"
        placeholder="Otro: escribe un emoticono"
        value={custom}
        maxLength={16}
        onChange={(e) => onChange(e.target.value.trim())}
        aria-label="Otro emoticono"
      />
    </div>
  );
}
