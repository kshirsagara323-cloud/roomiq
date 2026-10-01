import { Star, Loader2 } from 'lucide-react';

export const Loader = ({ label = 'Loading' }) => (
  <div className="center-box" role="status">
    <Loader2 className="spin" size={28} />
    <span>{label}…</span>
  </div>
);

export const Empty = ({ title, text, children }) => (
  <div className="empty">
    <h3>{title}</h3>
    {text && <p>{text}</p>}
    {children}
  </div>
);

export function Stars({ value = 0, size = 16, onChange }) {
  return (
    <span className="stars" aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className="star-btn"
          disabled={!onChange}
          onClick={() => onChange && onChange(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <Star size={size} className={n <= Math.round(value) ? 'on' : ''} />
        </button>
      ))}
    </span>
  );
}

export const Field = ({ label, hint, children }) => (
  <label className="field">
    <span className="field-label">{label}</span>
    {children}
    {hint && <span className="field-hint">{hint}</span>}
  </label>
);
