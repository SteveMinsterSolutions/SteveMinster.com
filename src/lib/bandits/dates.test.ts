// Run: npm run test:bandits
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signupsClosed, dayShort, dayLong, monthDayRange, dayRange, formatDobInput, usDateToIso } from './dates.ts';

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

test('dob mask: slashes as digits are typed', () => {
  assert.equal(formatDobInput('0'), '0');
  assert.equal(formatDobInput('05'), '05');
  assert.equal(formatDobInput('050'), '05/0');
  assert.equal(formatDobInput('0501'), '05/01');
  assert.equal(formatDobInput('05012'), '05/01/2');
  assert.equal(formatDobInput('050120131'), '05/01/2013'); // capped at 8 digits
  assert.equal(formatDobInput('05/01/2013'), '05/01/2013'); // re-formatting is stable
  assert.equal(formatDobInput('05/0'), '05/0');
  assert.equal(formatDobInput('05/'), '05');               // backspace past the slash
  assert.equal(formatDobInput('5/'), '05');                // typed slash pads
  assert.equal(formatDobInput('5/1/2013'), '05/01/2013');  // pasted short form
  assert.equal(formatDobInput('05-01-2013'), '05/01/2013');
  assert.equal(formatDobInput(''), '');
});

test('dob mask: US → ISO; partial or odd input passes through for validation to reject', () => {
  assert.equal(usDateToIso('05/01/2013'), '2013-05-01');
  assert.equal(usDateToIso('02/30/2013'), '2013-02-30'); // validateSignup rejects Feb 30
  assert.equal(usDateToIso('05/01/20'), '05/01/20');
  assert.equal(usDateToIso(''), '');
});
