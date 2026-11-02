import { useLayoutEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
}

// Multi-line text that grows with its content instead of scrolling inside.
export default function AutoTextarea({ value, onChange, onBlur, placeholder, className }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea ref={ref} className={className} rows={1} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />
  );
}
