// Run: npm run test:bandits
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bbtlRoster, missingNumbers, type RosterPlayer } from './bbtl-roster.ts';

const info = { title: 'BBTL', teamName: 'Wilson County Bandits', division: '13U', headCoach: 'Chris Oguin', playerRows: 22 };
const p = (last: string, status = 'rostered', assigned_number: number | null = 7): RosterPlayer =>
  ({ status, player_first: 'Test', player_last: last, assigned_number, dob: '2013-05-01', weight_lbs: 110 });

test('bbtl: header block, 22 player lines, 5 staff lines', () => {
  const out = bbtlRoster([], info);
  assert.deepEqual(out[3], ['Team Name', 'Wilson County Bandits']);
  assert.deepEqual(out[4], ['Age Division (6U-13U)', '13U']);
  assert.deepEqual(out[6], ['Head Coach', 'Chris Oguin', '', '']);
  assert.deepEqual(out[7], ['Team Representative', '', '', '']);
  assert.deepEqual(out[10], ['#', 'Name', 'Jersey #', 'Birthdate', 'Weight (lb)']);
  const players = out.slice(11, 33);
  assert.deepEqual(players.map((r) => r[0]), Array.from({ length: 22 }, (_, i) => i + 1));
  assert.deepEqual(out.slice(-5), [
    [1, 'Chris Oguin', 'Head coach'], [2, '', 'Assistant coach'], [3, '', 'Assistant coach'],
    [4, '', 'Assistant coach'], [5, '', 'Team manager'],
  ]);
  assert.equal(out.length, 41);
});

test('bbtl: rostered only, by last name, US dates, blank number when unassigned', () => {
  const out = bbtlRoster([p('Charlie'), p('alpha', 'rostered', null), p('Bravo', 'waitlist'), p('Delta', 'withdrawn')], info);
  assert.deepEqual(out[11], [1, 'Test alpha', '', '05/01/2013', 110]);
  assert.deepEqual(out[12], [2, 'Test Charlie', 7, '05/01/2013', 110]);
  assert.deepEqual(out[13], [3, '', '', '', '']);
});

test('bbtl: missing-number count is rostered only; 0 counts as assigned', () => {
  assert.equal(missingNumbers([p('A', 'rostered', null), p('B', 'waitlist', null), p('C', 'rostered', 0)]), 1);
});
