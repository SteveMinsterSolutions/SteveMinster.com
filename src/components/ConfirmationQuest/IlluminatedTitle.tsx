// A heading whose first letter is an illuminated initial: gold Cinzel Decorative on a
// lapis ground with a gold vine frame (original drawing). The split letters are
// aria-hidden; screen readers get the whole text once, from the sr-only span.
import book from './book.module.css';
import styles from './IlluminatedTitle.module.css';

interface Props {
  text: string;
  as?: 'h1' | 'h2';
  /** Centered for the title page; left for everything else. */
  align?: 'center' | 'left';
}

function Corner({ rotate }: { rotate: number }) {
  return (
    <g transform={`rotate(${rotate} 40 40)`}>
      <path d="M9 25C9 15 15 9 25 9" />
      <path d="M25 9c4 0 6.2 3 4.2 5.6-1.6 2-4.6 1-3.8-1.2" />
      <path d="M9 25c0 4 3 6.2 5.6 4.2 2-1.6 1-4.6-1.2-3.8" />
      <path d="M12.5 12.5c3.2-1.2 5.6.8 4.6 4.2-3.2 1.2-5.6-.8-4.6-4.2z" className={styles.leaf} />
    </g>
  );
}

export default function IlluminatedTitle({ text, as: Tag = 'h1', align = 'left' }: Props) {
  const [first = '', ...restChars] = Array.from(text.trim());
  const rest = restChars.join('');
  return (
    <Tag className={`${styles.title} ${align === 'center' ? styles.center : ''}`}>
      <span className={styles.initial} aria-hidden="true">
        <svg className={styles.frame} viewBox="0 0 80 80" focusable="false">
          <rect x="0" y="0" width="80" height="80" className={styles.ground} />
          <rect x="3.5" y="3.5" width="73" height="73" className={styles.rule} />
          <g className={styles.vine}>
            <Corner rotate={0} />
            <Corner rotate={90} />
            <Corner rotate={180} />
            <Corner rotate={270} />
          </g>
        </svg>
        <span className={styles.letter}>{first.toUpperCase()}</span>
      </span>
      <span className={styles.rest} aria-hidden="true">
        {rest}
      </span>
      <span className={book.srOnly}>{text}</span>
    </Tag>
  );
}
