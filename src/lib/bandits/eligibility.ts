// DOB + grade → eligibility flag (README §7). Flag, never block: the coach reviews.
// Dates are compared as YYYY-MM-DD strings, which sort chronologically — no Date
// objects, no timezone math. Boundaries mirror bandits.json → eligibility
// (cutoff 2026-07-01, born on or after 2012-07-02); eligibility.test.ts checks they agree.

export type EligibilityFlag = 'ok' | 'needs_8th_grade_proof' | 'review';

/** Born after this → under 10 on the cutoff: implausibly young for 13U. */
export const TOO_YOUNG_AFTER = '2016-07-01';
/** Born on or after this → 13 or younger on the cutoff. */
export const OK_FROM = '2012-07-02';
/** Born on or after this (and before OK_FROM) → 14 on the cutoff. */
export const FOURTEEN_FROM = '2011-07-02';

/** First match wins; the "too young" row must run before "ok", whose range it overlaps. */
export function eligibilityFlag(dob: string, grade: string): EligibilityFlag {
  if (dob > TOO_YOUNG_AFTER) return 'review';
  if (dob >= OK_FROM) return 'ok';
  if (dob >= FOURTEEN_FROM) return grade === '8th' ? 'needs_8th_grade_proof' : 'review';
  return 'review';
}
