// Run: npm run test:bandits   (Node's built-in runner; Node strips the TS types)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { eligibilityFlag, OK_FROM, TOO_YOUNG_AFTER } from './eligibility.ts';

test('boundaries agree with bandits.json', () => {
  const data = JSON.parse(readFileSync(new URL('../../data/bandits.json', import.meta.url), 'utf8'));
  assert.equal(OK_FROM, data.eligibility.bornOnOrAfter);
  assert.equal(TOO_YOUNG_AFTER.slice(4), data.eligibility.cutoff.slice(4)); // same month-day as the cutoff
});

const cases: [dob: string, grade: string, flag: string][] = [
  // after 2016-07-01 → review (implausibly young), even though it's also "on or after 2012-07-02"
  ['2016-07-02', '6th', 'review'],
  ['2019-01-01', '7th', 'review'],
  // 2012-07-02 … 2016-07-01 → ok
  ['2016-07-01', '6th', 'ok'],
  ['2014-03-15', '7th', 'ok'],
  ['2012-07-02', '8th', 'ok'],
  ['2012-07-02', 'Other', 'ok'],
  // 2011-07-02 … 2012-07-01 (14 on the cutoff)
  ['2012-07-01', '8th', 'needs_8th_grade_proof'],
  ['2011-07-02', '8th', 'needs_8th_grade_proof'],
  ['2012-07-01', '7th', 'review'],
  ['2011-07-02', 'Other', 'review'],
  // before 2011-07-02 → review
  ['2011-07-01', '8th', 'review'],
  ['2009-01-01', '8th', 'review'],
];

for (const [dob, grade, flag] of cases) {
  test(`${dob} / ${grade} → ${flag}`, () => assert.equal(eligibilityFlag(dob, grade), flag));
}
