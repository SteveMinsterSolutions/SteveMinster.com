// Display helpers for the plain YYYY-MM-DD dates in bandits.json.
// Dates are parsed and formatted in UTC so a calendar date never shifts a day
// with the server's or browser's local timezone.

const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...opts }).format(parse(iso));

/** "Oct 28" */
export const monthDay = (iso: string) => fmt(iso, { month: 'short', day: 'numeric' });

/** "Fri, Nov 13" */
export const dayShort = (iso: string) => `${fmt(iso, { weekday: 'short' })}, ${monthDay(iso)}`;

/** "Sunday, Nov 1" */
export const dayLong = (iso: string) => `${fmt(iso, { weekday: 'long' })}, ${monthDay(iso)}`;

/** "July 1, 2026" */
export const fullDate = (iso: string) => fmt(iso, { month: 'long', day: 'numeric', year: 'numeric' });

/** "November 8" */
export const monthLongDay = (iso: string) => fmt(iso, { month: 'long', day: 'numeric' });

/** "Nov 13–15" (or "Oct 30–Nov 1" across months) */
export const monthDayRange = (start: string, end: string) => {
  const [m1, m2] = [fmt(start, { month: 'short' }), fmt(end, { month: 'short' })];
  const [d1, d2] = [fmt(start, { day: 'numeric' }), fmt(end, { day: 'numeric' })];
  return m1 === m2 ? `${m1} ${d1}–${d2}` : `${m1} ${d1}–${m2} ${d2}`;
};

/** "Sat–Sun, Nov 14–15" */
export const dayRange = (start: string, end: string) =>
  `${fmt(start, { weekday: 'short' })}–${fmt(end, { weekday: 'short' })}, ${monthDayRange(start, end)}`;
