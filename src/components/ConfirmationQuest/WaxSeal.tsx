// A badge drawn as a wax seal: an earned one is a rubric wax disc with a gold rim and
// a pale-gold emblem pressed into it; one not yet earned is the same seal as a faint
// ink outline. The emblem comes from the badge's icon code; unknown codes get a plain
// cross. Original drawings on a 40-unit grid, kept to a few strokes so they read at
// 40px. The name and status are always written beside the seal, so it is hidden from
// screen readers. stamp presses it on (not with reduced motion).
import type { ReactElement } from 'react';
import styles from './WaxSeal.module.css';

interface Props {
  icon: string | null;
  earned: boolean;
  /** Rendered width and height in px. */
  size?: number;
  stamp?: boolean;
}

// The uneven rim of poured wax: fourteen soft lobes.
const RIM = (() => {
  const n = 28;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 18.6 : 17.4;
    pts.push(`${(20 + r * Math.cos(a)).toFixed(2)},${(20 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
})();

const CROSS = <path d="M20 12v16M14.5 17.5h11" />;

// Strokes by default; parts marked with styles.solid are filled.
const EMBLEMS: Record<string, ReactElement> = {
  'seal-cross': CROSS,
  'seal-candle': (
    <>
      <path className={styles.solid} d="M20 11.2c2.3 2.6 2.4 4.9 0 6.1c-2.4-1.2-2.3-3.5 0-6.1z" />
      <path d="M17.6 19.6h4.8v7.6h-4.8zM14.8 28.4h10.4" />
    </>
  ),
  'seal-hands': (
    <>
      <g className={styles.flat}>
        <rect x="15.2" y="13.2" width="2" height="7" rx="1" />
        <rect x="17.6" y="11.6" width="2" height="8.4" rx="1" />
        <rect x="20" y="12.2" width="2" height="7.8" rx="1" />
        <rect x="22.4" y="14" width="1.9" height="6.4" rx="0.95" />
        <path d="M15.2 19.4h9.1v4c0 3-1.8 5-4 5.6h-2.8c-1.4-.8-2.3-2.4-2.3-4.4zM15.8 24.4l-3.9-4.6a1 1 0 0 1 1.5-1.3l3 2.9z" />
      </g>
      <path className={styles.cut} d="M19.7 26.4c-1.8-1.2-2.8-2.2-2.8-3.4a1.4 1.4 0 0 1 2.8-.5a1.4 1.4 0 0 1 2.8.5c0 1.2-1 2.2-2.8 3.4z" />
    </>
  ),
  'seal-chalice': (
    <path d="M14.2 12.6h11.6c0 5-2.6 8.2-5.8 8.2s-5.8-3.2-5.8-8.2zM20 20.8v5.4M15.6 28.2c1.2-1.6 7.6-1.6 8.8 0z" />
  ),
  'seal-scroll': (
    <path d="M15.4 14v12.2M24.6 13.8V26M13.4 13.8h11.2a1.6 1.6 0 0 1 0 3.2M15.4 26.2h11.2M13.4 13.8a1.6 1.6 0 0 0 0 3.2h2M18 19.4h4.2M18 22.4h4.2" />
  ),
  'seal-halo': (
    <>
      <circle cx="20" cy="16.6" r="5.4" />
      <circle className={styles.solid} cx="20" cy="17.2" r="2.5" />
      <path d="M13.6 28.6c.6-4.2 3.2-6 6.4-6s5.8 1.8 6.4 6" />
    </>
  ),
  'seal-bell': (
    <>
      <path d="M14.4 25c0-7.4 1.8-11.4 5.6-11.4s5.6 4 5.6 11.4zM12.8 25h14.4M20 13.6v-2" />
      <circle className={styles.solid} cx="20" cy="27.6" r="1.5" />
    </>
  ),
  'seal-quill': <path d="M27.2 11.4c-6.6.8-11 6-11.8 13.6c6.4-1.4 10.8-6.6 11.8-13.6zM27.2 11.4L13 28.8M18.6 21.6l3 .4" />,
  'seal-keys': (
    <>
      <circle cx="14.8" cy="14.8" r="2.8" />
      <circle cx="25.2" cy="14.8" r="2.8" />
      <path d="M16.8 16.8l10.4 10.4M24.6 24.6l-1.8 1.8M27.2 27.2l-1.8 1.8M23.2 16.8L12.8 27.2M15.4 24.6l1.8 1.8M12.8 27.2l1.8 1.8" />
    </>
  ),
  'seal-dove': (
    <>
      <path
        className={styles.flat}
        d="M11.4 14.2l2-1.2c.6-1.8 2.8-2.2 4-.8c.8 1 .9 2.2.6 3.4c1.2 1.8 2.4 2.8 3.8 3.2c.4-3.6 2.4-6.4 6.4-8c-.2 3.6-1 6.6-2.8 8.8c1.4 1.8 2.6 4.2 3.2 7.2l-2.6-1.2l-.4 2.6c-1.4-1.6-3.2-2.6-5.2-2.8c-3.4-.4-5.8-2.6-6.6-5.6c-.4-1.6-.6-3.2-.4-4.6z"
      />
      <circle className={styles.cut} cx="15.4" cy="13.6" r="0.7" />
    </>
  ),
  'seal-laurel': (
    <path d="M18.2 28.6c-5.2-2.6-6.6-9.4-3.2-15.6M21.8 28.6c5.2-2.6 6.6-9.4 3.2-15.6M13.4 23.4l-2.2.4M12.6 19l-2-.8M13.6 15l-1.6-1.6M26.6 23.4l2.2.4M27.4 19l2-.8M26.4 15l1.6-1.6M16 26.6l-1.4 1.6M24 26.6l1.4 1.6" />
  ),
};

export default function WaxSeal({ icon, earned, size = 40, stamp }: Props) {
  const emblem = (icon && EMBLEMS[icon]) || CROSS;
  return (
    <svg
      className={`${styles.seal} ${earned ? styles.earned : styles.open} ${stamp && earned ? styles.stamp : ''}`}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      focusable="false"
    >
      <path d={RIM} className={styles.wax} />
      <circle cx="20" cy="20" r="13.6" className={styles.ring} />
      <g className={styles.emblem}>{emblem}</g>
    </svg>
  );
}
