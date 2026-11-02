import type { CSSProperties, ImgHTMLAttributes, ReactNode } from 'react';
import type { Rating } from '../api/types';
import { useTheme } from '../theme/ThemeContext';
import { hashSeed, photoStripe, scoreColor } from '../utils/colors';
import { normalizeImageUrl, thumbSrcSet, thumbUrl } from '../utils/images';
import './bits.css';

/** 1-10 score in a circle colored from red (1) to green (10). */
export function ScoreBadge({ value, size = 30, onClick, label }: { value: number | null | undefined; size?: number; onClick?: () => void; label?: string }) {
  const fontSize = size >= 38 ? 16 : size <= 26 ? 11 : 13;
  const style: CSSProperties = { width: size, height: size, background: scoreColor(value), fontSize };
  if (onClick) {
    return (
      <button type="button" className="score-badge" style={style} onClick={onClick} aria-label={label}>
        {value}
      </button>
    );
  }
  return (
    <span className="score-badge" style={style}>
      {value}
    </span>
  );
}

/** Home card scores: one badge, or two overlapping minis plus "+N". */
export function ScoreStack({ ratings }: { ratings: Rating[] }) {
  if (ratings.length <= 1) return <ScoreBadge value={ratings[0]?.value} size={30} />;
  const extra = ratings.length - 2;
  return (
    <span className="score-stack">
      {ratings.slice(0, 2).map((r) => (
        <span key={r.id} className="score-badge mini" style={{ background: scoreColor(r.value) }}>
          {r.value}
        </span>
      ))}
      {extra > 0 && <span className="score-badge mini extra">+{extra}</span>}
    </span>
  );
}

export function TagChip({ label }: { label: string }) {
  if (!label) return null;
  return <span className="tag-chip">{label}</span>;
}

export function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`filter-chip${active ? ' on' : ''}`} onClick={onClick} aria-pressed={active}>
      {label}
    </button>
  );
}

/** Striped placeholder shown instead of a cover photo. */
export function PhotoStripe({ id, className = '', stripe }: { id: string; className?: string; stripe?: number }) {
  const { dark } = useTheme();
  return <div className={className} style={{ background: photoStripe(hashSeed(id), dark, stripe) }} />;
}

type PhotoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  url: string | null | undefined;
  /** Use the server-side thumbnail (grids, previews) instead of the original. */
  thumb?: boolean;
  sizes?: string;
};

/** Any photo from the API: normalizes the URL and picks thumbnail vs original. */
export function Photo({ url, thumb = false, sizes, alt = '', loading = 'lazy', ...rest }: PhotoProps) {
  const src = normalizeImageUrl(url);
  if (!src) return null;
  return (
    <img
      src={thumb ? thumbUrl(src, 400)! : src}
      srcSet={thumb ? thumbSrcSet(src) : undefined}
      sizes={thumb ? sizes : undefined}
      alt={alt}
      loading={loading}
      decoding="async"
      draggable={false}
      {...rest}
    />
  );
}

export function Spinner({ small, onAccent, label = 'Cargando' }: { small?: boolean; onAccent?: boolean; label?: string }) {
  return <span className={`spinner${small ? ' small' : ''}${onAccent ? ' on-accent' : ''}`} role="status" aria-label={label} />;
}

export function SectionLabel({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span className="t-section-label" style={color ? { color } : undefined}>
      {children}
    </span>
  );
}
