// Activity types and rows as the contract describes them, plus the words the UI uses
// for points, caps and status. Shared by Log activity and (later) Approvals.

export interface ActivityType {
  code: string;
  name: string;
  category: string;
  points: number;
  per_hour: boolean;
  weekly_cap: number | null;
  monthly_cap: number | null;
  lifetime_cap: number | null;
  candidate_only: boolean;
  allows_note: boolean;
  requires_supervisor: boolean;
  active: boolean;
  sort: number;
}

export const TYPE_COLUMNS =
  'code, name, category, points, per_hour, weekly_cap, monthly_cap, lifetime_cap, candidate_only, allows_note, requires_supervisor, active, sort';

export interface ActivityRow {
  id: number;
  type_code: string;
  occurred_on: string;
  hours: number | null;
  note: string | null;
  supervised_by: string | null;
  with_candidate: string | null;
  status: 'pending' | 'approved' | 'rejected';
  points_awarded: number | null;
  created_at: string;
}

export const ROW_COLUMNS =
  'id, type_code, occurred_on, hours, note, supervised_by, with_candidate, status, points_awarded, created_at';

export const CATEGORY_LABELS: Record<string, string> = {
  mass: 'Mass',
  youth: 'Youth group',
  service: 'Service',
  sacrament: 'Sacraments',
  event: 'Events',
  learning: 'Learning',
  other: 'Other',
  prayer: 'Prayers',
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const times = (n: number) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);

/** "25 points" or "10 points an hour", then any cap: "Counts once a week." */
export function typeHint(t: ActivityType): string {
  const pts = t.per_hour ? `${plural(t.points, 'point', 'points')} an hour` : plural(t.points, 'point', 'points');
  const caps: string[] = [];
  if (t.weekly_cap !== null) caps.push(`${times(t.weekly_cap)} a week`);
  if (t.monthly_cap !== null) caps.push(`${times(t.monthly_cap)} a month`);
  if (t.lifetime_cap !== null) caps.push(t.lifetime_cap === 1 ? 'once' : `${times(t.lifetime_cap)} in all`);
  return caps.length ? `${pts}. Counts ${caps.join(' and ')}.` : `${pts}.`;
}

/**
 * Why an approved activity earned 0 points. approve_activity checks the weekly, then
 * monthly, then lifetime cap; the row doesn't record which one applied, so this names
 * the type's first cap in that order. Prayers say "already recited".
 */
export function capWords(t: ActivityType | undefined): string | null {
  if (!t) return null;
  if (t.weekly_cap !== null) return 'weekly cap';
  if (t.monthly_cap !== null) return 'monthly cap';
  if (t.lifetime_cap !== null) return t.category === 'prayer' ? 'already recited' : 'lifetime cap';
  return null;
}

/** "Waiting for approval", "Approved, 25 points", "Approved, 0 points (weekly cap)", "Rejected". */
export function statusWords(row: ActivityRow, t: ActivityType | undefined): string {
  if (row.status === 'pending') return 'Waiting for approval';
  if (row.status === 'rejected') return 'Rejected';
  const pts = row.points_awarded ?? 0;
  if (pts > 0) return `Approved, ${plural(pts, 'point', 'points')}`;
  const why = capWords(t);
  return why ? `Approved, 0 points (${why})` : 'Approved, 0 points';
}
