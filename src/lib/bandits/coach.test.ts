// Run: npm run test:bandits
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, toCsv } from './csv.ts';
import { suggestNumbers, type NumberPlayer } from './numbers.ts';

test('csv: formula injection guard', () => {
  assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  assert.equal(csvCell('+1 615'), "'+1 615");
  assert.equal(csvCell('-5'), "'-5");
  assert.equal(csvCell('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(csvCell('\tcmd'), "'\tcmd");
  assert.equal(csvCell('Test Player'), 'Test Player');
  assert.equal(csvCell('a-b'), 'a-b'); // only a LEADING symbol is guarded
});

test('csv: quoting, nulls, numbers', () => {
  assert.equal(csvCell('Player, Test'), '"Player, Test"');
  assert.equal(csvCell('line1\nline2'), '"line1\nline2"');
  assert.equal(csvCell(null), '');
  assert.equal(csvCell(undefined), '');
  assert.equal(csvCell(0), '0');
  assert.equal(csvCell(false), 'false');
  assert.equal(toCsv([['a', 'b'], [1, null]]), '﻿a,b\r\n1,\r\n');
});

const p = (id: string, seq: number, choices: [number, number, number], extra: Partial<NumberPlayer> = {}): NumberPlayer => ({
  id, signup_seq: seq, status: 'rostered', assigned_number: null,
  number_choice_1: choices[0], number_choice_2: choices[1], number_choice_3: choices[2], ...extra,
});

test('numbers: sign-up order, first free choice', () => {
  const out = suggestNumbers([p('b', 2, [7, 12, 22]), p('a', 1, [7, 8, 9]), p('c', 3, [7, 12, 30])]);
  assert.deepEqual(out, [
    { id: 'a', number: 7, choice: 1 },
    { id: 'b', number: 12, choice: 2 },
    { id: 'c', number: 30, choice: 3 },
  ]);
});

test('numbers: already-assigned players keep their number and block it', () => {
  const out = suggestNumbers([p('a', 1, [7, 8, 9]), p('z', 9, [1, 2, 3], { assigned_number: 7 })]);
  assert.deepEqual(out, [{ id: 'a', number: 8, choice: 2 }]);
});

test('numbers: waitlisted holders block, withdrawn holders do not; waitlist gets no suggestion', () => {
  const out = suggestNumbers([
    p('a', 1, [7, 8, 9]),
    p('w', 2, [1, 2, 3], { status: 'waitlist', assigned_number: 7 }),
    p('x', 3, [1, 2, 3], { status: 'withdrawn', assigned_number: 8 }),
    p('q', 4, [40, 41, 42], { status: 'waitlist' }),
  ]);
  assert.deepEqual(out, [{ id: 'a', number: 8, choice: 2 }]);
});

test('numbers: no free choice → needs a number', () => {
  const out = suggestNumbers([p('a', 1, [7, 8, 9]), p('b', 2, [7, 8, 9]), p('c', 3, [7, 8, 9]), p('d', 4, [7, 8, 9])]);
  assert.deepEqual(out.map((s) => s.number), [7, 8, 9, null]);
  assert.equal(out[3].choice, null);
});

test('numbers: 0 is a real number', () => {
  const out = suggestNumbers([p('a', 1, [0, 1, 2]), p('b', 2, [0, 1, 2])]);
  assert.deepEqual(out.map((s) => s.number), [0, 1]);
});
