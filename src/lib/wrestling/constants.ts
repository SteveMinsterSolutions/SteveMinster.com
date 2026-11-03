// Warriors wrestling: shared constants. Pure data, safe for server and browser.
// Spec: WRESTLING_INTEGRATION_README.md §5–§6 (local only).

/** TSSAA middle-school weight classes, lightest to heaviest. */
export const WEIGHTS = [75, 82, 90, 98, 106, 114, 122, 130, 138, 145, 155, 170, 185, 215, 260] as const;
export type Weight = (typeof WEIGHTS)[number];
export const isWeight = (w: unknown): w is Weight => WEIGHTS.includes(w as Weight);

export type Side = 'us' | 'them';
export type Level = 'V' | 'JV';
export const other = (s: Side): Side => (s === 'us' ? 'them' : 'us');

export const PERIODS = ['P1', 'P2', 'P3', 'SV', 'TB1', 'TB2', 'UTB'] as const;
export type Period = (typeof PERIODS)[number];
export const isPeriod = (p: unknown): p is Period => PERIODS.includes(p as Period);
export const nextPeriod = (p: Period): Period | null => PERIODS[PERIODS.indexOf(p) + 1] ?? null;
export const PERIOD_LABEL: Record<Period, string> = {
  P1: '1st', P2: '2nd', P3: '3rd', SV: 'SV', TB1: 'TB1', TB2: 'TB2', UTB: 'UTB',
};

/** Event codes and the match points each gives to `side` (the receiver). */
export const EVENT_POINTS = {
  T3: 3, E1: 1, R2: 2,
  N2: 2, N3: 3, N4: 4, N5: 5,
  PEN1: 1, PEN2: 2,
  RO1: 1,
  SW: 0, C: 0,
} as const;
export type EventCode = keyof typeof EVENT_POINTS;
export const EVENT_CODES = Object.keys(EVENT_POINTS) as EventCode[];
export const isEventCode = (c: unknown): c is EventCode =>
  typeof c === 'string' && Object.prototype.hasOwnProperty.call(EVENT_POINTS, c);

export const RESULT_TYPES = ['FALL', 'TF', 'MD', 'DEC', 'FOR', 'DEF', 'DQ', 'DFF'] as const;
export type ResultType = (typeof RESULT_TYPES)[number];
export const isResultType = (r: unknown): r is ResultType => RESULT_TYPES.includes(r as ResultType);

/** Dual-meet team points for the winner. DFF scores 0 for both. */
export const TEAM_POINTS: Record<ResultType, number> = {
  FALL: 6, FOR: 6, DEF: 6, DQ: 6, TF: 5, MD: 4, DEC: 3, DFF: 0,
};

export const RESULT_LABEL: Record<ResultType, string> = {
  FALL: 'Fall', TF: 'Tech fall', MD: 'Major', DEC: 'Dec', FOR: 'Forfeit',
  DEF: 'Default', DQ: 'DQ', DFF: 'Double forfeit',
};

/** Margins: 8+ is a major decision, 15+ a technical fall. */
export const MAJOR_MARGIN = 8;
export const TECH_FALL_MARGIN = 15;

/**
 * Dual tiebreaker criteria letters a–q. Short scorer-side labels in our own words
 * (scorer view only; never shown on the public follow page).
 */
export const TIEBREAK_CRITERIA: { letter: string; label: string }[] = [
  { letter: 'a', label: 'Fewer team pts lost to misconduct' },
  { letter: 'b', label: 'Fewer coach misconduct deductions' },
  { letter: 'c', label: 'Fewer unsportsmanlike match pts' },
  { letter: 'd', label: 'More bouts won' },
  { letter: 'e', label: 'More pins/forfeits/defaults/DQs' },
  { letter: 'f', label: 'Fewer forfeits given' },
  { letter: 'g', label: 'More tech falls' },
  { letter: 'h', label: 'More majors' },
  { letter: 'i', label: 'More first-points value' },
  { letter: 'j', label: 'More near-fall pts' },
  { letter: 'k', label: 'More takedowns' },
  { letter: 'l', label: 'More reversals' },
  { letter: 'm', label: 'More escapes' },
  { letter: 'n', label: 'Opp lost more stall pts' },
  { letter: 'o', label: 'Opp had more stall warnings' },
  { letter: 'p', label: 'Opp had more other penalties' },
  { letter: 'q', label: 'Disk flip' },
];
export const isTiebreakCriterion = (c: unknown): c is string =>
  typeof c === 'string' && /^[a-q]$/.test(c);
