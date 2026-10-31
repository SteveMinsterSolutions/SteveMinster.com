// BBTL "Official Team Roster" as CSV rows, laid out like the tournament's
// one-page form: header block, 22 numbered player rows, 5 coaching-staff rows.
// No imports so the node test runner can load it directly.

export type RosterPlayer = {
  status: string;
  player_first: string;
  player_last: string;
  assigned_number: number | null;
  dob: string; // YYYY-MM-DD
  weight_lbs: number;
};

export type RosterInfo = {
  title: string;      // "Battle Between the Lakes · Nov 13–15, 2026 · Mt. Juliet, TN"
  teamName: string;
  division: string;
  headCoach: string;
  playerRows: number; // 22
};

const STAFF_ROLES = ['Head coach', 'Assistant coach', 'Assistant coach', 'Assistant coach', 'Team manager'];

/** 2013-05-01 → 05/01/2013 */
export const usDate = (iso: string) => `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}`;

type Named = Pick<RosterPlayer, 'player_first' | 'player_last'>;
export const byLastName = (a: Named, b: Named) =>
  a.player_last.localeCompare(b.player_last, 'en', { sensitivity: 'base' }) ||
  a.player_first.localeCompare(b.player_first, 'en', { sensitivity: 'base' });

export function bbtlRoster(rows: RosterPlayer[], info: RosterInfo): unknown[][] {
  const roster = rows.filter((r) => r.status === 'rostered').sort(byLastName);
  // Always print the full form; if the cap was ever raised past it, keep numbering.
  const n = Math.max(info.playerRows, roster.length);
  const players = Array.from({ length: n }, (_, i) => {
    const r = roster[i];
    return r
      ? [i + 1, `${r.player_first} ${r.player_last}`, r.assigned_number ?? '', usDate(r.dob), r.weight_lbs]
      : [i + 1, '', '', '', ''];
  });
  return [
    ['Official Team Roster'],
    [info.title],
    [],
    ['Team Name', info.teamName],
    ['Age Division (6U-13U)', info.division],
    ['', 'Name', 'Phone', 'Email'],
    ['Head Coach', info.headCoach, '', ''],
    ['Team Representative', '', '', ''],
    [],
    [`Players (${info.playerRows})`, '', '', '', 'Birth certificate required at check-in'],
    ['#', 'Name', 'Jersey #', 'Birthdate', 'Weight (lb)'],
    ...players,
    [],
    ['Coaching Staff (up to 5 free passes)', '', 'Unlisted coaches need a $25 sideline pass'],
    ['#', 'Name', 'Role'],
    ...STAFF_ROLES.map((role, i) => [i + 1, i === 0 ? info.headCoach : '', role]),
  ];
}

/** Rostered players with no assigned number (the dashboard warns before export). */
export const missingNumbers = (rows: Pick<RosterPlayer, 'status' | 'assigned_number'>[]) =>
  rows.filter((r) => r.status === 'rostered' && r.assigned_number == null).length;
