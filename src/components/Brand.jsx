import lockup from '../assets/brand/forja-lockup-horizontal.svg?raw';
import symbol from '../assets/brand/forja-symbol.svg?raw';

// Trusted, local SVG masters supplied by the project owner. Kept byte-for-byte
// so currentColor themes the original geometry without filters or redraws.
export function Brand({ compact = false, className = '' }) {
  return (
    <span
      className={`brand-mark ${compact ? 'brand-symbol' : ''} ${className}`}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: compact ? symbol : lockup }}
    />
  );
}
