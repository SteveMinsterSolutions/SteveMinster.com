// A rubric hedera leaf between short rules: the section divider. Original drawing.
import styles from './Fleuron.module.css';

export default function Fleuron() {
  return (
    <div className={styles.fleuron} aria-hidden="true">
      <svg viewBox="0 0 120 20" width="120" height="20" focusable="false">
        <path d="M4 10h38M78 10h38" stroke="currentColor" strokeWidth="1" />
        <path
          d="M60 16c-1.5-2.2-7-4.4-8.6-7.6-1.4-2.8.6-5.6 3.4-5.6 2.3 0 3.9 1.4 5.2 3.4
             1.3-2 2.9-3.4 5.2-3.4 2.8 0 4.8 2.8 3.4 5.6C67 11.6 61.5 13.8 60 16z"
          fill="currentColor"
        />
        <path
          d="M60 16c-2.6 1.9-6.4 2.3-9.2.9M69.5 9.5c2.4-.6 4.6-.2 6.2 1.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <circle cx="47" cy="10" r="1.3" fill="currentColor" />
        <circle cx="73" cy="10" r="1.3" fill="currentColor" />
      </svg>
    </div>
  );
}
