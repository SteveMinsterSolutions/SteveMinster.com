// Run: npm run test:bandits
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signupsClosed, dayShort, dayLong, monthDayRange, dayRange } from './dates.ts';

const DEADLINE = '2026-11-01';

test('open through 11:59 PM Central on Nov 1 (CST, UTC-6)', () => {
  assert.equal(signupsClosed(DEADLINE, new Date('2026-11-02T05:59:59Z')), false);
});
test('closed from 12:00 AM Central on Nov 2', () => {
  assert.equal(signupsClosed(DEADLINE, new Date('2026-11-02T06:00:00Z')), true);
});
test('open on Nov 1 even after midnight UTC', () => {
  assert.equal(signupsClosed(DEADLINE, new Date('2026-11-01T23:30:00Z')), false);
});
test('open well before', () => {
  assert.equal(signupsClosed(DEADLINE, new Date('2026-10-22T12:00:00Z')), false);
});

test('display formats', () => {
  assert.equal(dayShort('2026-11-04'), 'Wed, Nov 4');
  assert.equal(dayLong('2026-11-01'), 'Sunday, Nov 1');
  assert.equal(monthDayRange('2026-11-13', '2026-11-15'), 'Nov 13–15');
  assert.equal(dayRange('2026-11-27', '2026-11-29'), 'Fri–Sun, Nov 27–29');
});
