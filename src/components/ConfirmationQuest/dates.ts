// Dates follow the game's clock, Central time, as the database's cq_today() does.
// Calendar dates travel as 'YYYY-MM-DD' strings and are handled as UTC midnights.

export function todayCentral(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "today", "tomorrow", or "Saturday, November 7". */
export function dueWords(iso: string, today: string): string {
  if (iso === today) return 'today';
  if (iso === addDays(today, 1)) return 'tomorrow';
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
