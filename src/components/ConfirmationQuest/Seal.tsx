// A status seal: an empty ink ring while pending, a gold wax seal bearing the points
// once approved, a rubric seal struck through when rejected. Original drawing. The
// status is always written beside it, so the seal itself is hidden from screen readers.
import styles from './Seal.module.css';

interface Props {
  status: 'pending' | 'approved' | 'rejected';
  points?: number | null;
}

// A wax seal's uneven rim: twelve soft lobes around the circle.
const RIM = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 === 0 ? 17 : 15.6;
    pts.push(`${(18 + r * Math.cos(a)).toFixed(2)},${(18 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
})();

export default function Seal({ status, points }: Props) {
  if (status === 'pending') {
    return (
      <svg className={styles.seal} viewBox="0 0 36 36" aria-hidden="true" focusable="false">
        <circle cx="18" cy="18" r="14" className={styles.pendingRing} />
      </svg>
    );
  }
  if (status === 'rejected') {
    return (
      <svg className={styles.seal} viewBox="0 0 36 36" aria-hidden="true" focusable="false">
        <path d={RIM} className={styles.rejectedWax} />
        <circle cx="18" cy="18" r="11" className={styles.innerRule} />
        <path d="M11 25L25 11" className={styles.strike} />
      </svg>
    );
  }
  const label = String(points ?? 0);
  return (
    <svg className={styles.seal} viewBox="0 0 36 36" aria-hidden="true" focusable="false">
      <path d={RIM} className={styles.approvedWax} />
      <circle cx="18" cy="18" r="11" className={styles.innerRule} />
      <text x="18" y="18" className={`${styles.points} ${label.length > 2 ? styles.small : ''}`}>
        {label}
      </text>
    </svg>
  );
}
