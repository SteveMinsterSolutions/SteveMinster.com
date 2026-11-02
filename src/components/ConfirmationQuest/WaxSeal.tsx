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
      <path className={styles.solid} d="M20 19.6c-2.6-1.7-4-3.1-4-4.7a2 2 0 0 1 4-.7a2 2 0 0 1 4 .7c0 1.6-1.4 3-4 4.7z" />
      <path d="M11.6 19c0 5 3.6 8.4 8.4 8.4s8.4-3.4 8.4-8.4M11.6 19c2.6-.4 5.8.8 8.4 2.8c2.6-2 5.8-3.2 8.4-2.8M20 21.8v5.6M12.1 22.4l2-.5M13.9 25.2l1.7-1.1M27.9 22.4l-2-.5M26.1 25.2l-1.7-1.1" />
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
        className={styles.solid}
        d="M20 25.8c-1.2 0-2-.9-2-2c0-.7.3-1.3.8-1.7l-1.4-1.9c-2.8.2-5.6-1.6-7-4.8c3 0 5.6.6 7.8 1.6l.2-3.4l-1.2-2.8l2.8 1l2.8-1l-1.2 2.8l.2 3.4c2.2-1 4.8-1.6 7.8-1.6c-1.4 3.2-4.2 5-7 4.8l-1.4 1.9c.5.4.8 1 .8 1.7c0 1.1-.8 2-2 2z"
      />
      <path d="M20 28.2v1.6M16.8 27.6l-1 1.3M23.2 27.6l1 1.3" />
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
