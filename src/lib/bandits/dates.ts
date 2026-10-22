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

/** "Sunday, November 1" */
export const dayMonthLong = (iso: string) => fmt(iso, { weekday: 'long', month: 'long', day: 'numeric' });

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

/** Today's calendar date in Mt. Juliet, as YYYY-MM-DD. */
export const chicagoToday = (now: Date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

/** Sign-ups close at midnight Central at the END of the deadline day. */
export const signupsClosed = (deadline: string, now: Date = new Date()) => chicagoToday(now) > deadline;

/** "Sat–Sun, Nov 14–15" */
export const dayRange = (start: string, end: string) =>
  `${fmt(start, { weekday: 'short' })}–${fmt(end, { weekday: 'short' })}, ${monthDayRange(start, end)}`;

/**
 * Date-of-birth text field mask: keeps digits, inserts slashes as they're typed
 * ("0501" → "05/01"). A slash typed after a single digit pads it ("5/" → "05").
 */
export function formatDobInput(raw: string): string {
  const parts = raw.replace(/[^\d/]/g, '').split('/');
  const digits = parts
    .map((p, i) => (i < 2 && i < parts.length - 1 && p.length === 1 ? `0${p}` : p))
    .join('')
    .slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** "05/01/2013" → "2013-05-01". Anything else comes back unchanged so validation rejects it. */
export const usDateToIso = (s: string) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim());
  return m ? `${m[3]}-${m[1]}-${m[2]}` : s;
};
