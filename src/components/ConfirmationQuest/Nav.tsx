// Bottom navigation: text labels on a ruled line. The current page hangs a season-green
// ribbon from the rule, like a book's ribbon marker. Adults get a sixth item, Approve,
// with the pending count as a small rubric numeral.
import styles from './Nav.module.css';

// Milestones has no nav item: Home's "See all milestones" opens it.
export type View = 'home' | 'log' | 'quiz' | 'boards' | 'prayers' | 'approve' | 'milestones';

interface Props {
  view: View;
  isAdult: boolean;
  pendingCount: number | null;
  onNavigate: (view: View) => void;
}

const ITEMS: { view: View; label: string; adultsOnly?: boolean }[] = [
  { view: 'home', label: 'Home' },
  { view: 'log', label: 'Log' },
  { view: 'quiz', label: 'Quiz' },
  { view: 'boards', label: 'Boards' },
  { view: 'prayers', label: 'Prayers' },
  { view: 'approve', label: 'Approve', adultsOnly: true },
];

export default function Nav({ view, isAdult, pendingCount, onNavigate }: Props) {
  return (
    <nav className={styles.nav} aria-label="Pages">
      <ul className={`${styles.list} ${isAdult ? styles.withApprove : ''}`}>
        {ITEMS.filter((item) => isAdult || !item.adultsOnly).map((item) => {
          const count = item.view === 'approve' && pendingCount ? pendingCount : 0;
          return (
            <li
              key={item.view}
              className={`${styles.item} ${item.view === 'approve' ? styles.approve : ''}`}
            >
              <a
                href={`?v=${item.view}`}
                className={styles.link}
                aria-current={item.view === view ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.view);
                }}
              >
                {item.label}
                {count > 0 && (
                  <>
                    <span className={styles.count} aria-hidden="true">
                      {count}
                    </span>
                    <span className={styles.srOnly}>, {count} waiting</span>
                  </>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
