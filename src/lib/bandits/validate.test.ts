// Run: npm run test:bandits
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSignup } from './validate.ts';

const valid = () => ({
  player_first: ' Test ', player_last: 'Player', dob: '2013-05-01', grade: '7th', school: '', weight_lbs: '120',
  years_played: '', positions: '', jersey_scale: 'youth', jersey_size: 'YM',
  number_choice_1: '7', number_choice_2: '0', number_choice_3: '99',
  helmet: 'own', avail_bbtl: 'yes_all', avail_tdc: 'unsure', tdc_id_type: 'nsid',
  guardian_name: 'Test Parent', guardian_relationship: 'mother', guardian_phone: '+1 (615) 555-0100',
  guardian_email: 'Test@Example.com', guardian2_name: '', guardian2_phone: '', contact_pref: '',
  emergency_name: 'Test Contact', emergency_phone: '615.555.0101', emergency_relationship: '', health_notes: '',
  ack_gear: true, ack_fee: true, ack_waiver: true, ack_docs: true, ack_accurate: true, photo_consent: false,
});
const errorsFor = (patch: Record<string, unknown>) => {
  const r = validateSignup({ ...valid(), ...patch });
  return r.ok ? {} : r.errors;
};

test('valid form normalizes', () => {
  const r = validateSignup(valid());
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.data.player_first, 'Test');
  assert.equal(r.data.guardian_phone, '6155550100');
  assert.equal(r.data.emergency_phone, '6155550101');
  assert.equal(r.data.guardian_email, 'test@example.com');
  assert.equal(r.data.number_choice_2, 0);
  assert.equal(r.data.weight_lbs, 120);
  assert.equal(r.data.school, null);
  assert.equal(r.data.years_played, null); // optional "Choose…" left blank
  assert.equal(r.data.contact_pref, null);
});

test('number choices', () => {
  assert.match(errorsFor({ number_choice_1: '00' }).number_choice_1, /00 isn't available/);
  assert.ok(errorsFor({ number_choice_1: '100' }).number_choice_1);
  assert.ok(errorsFor({ number_choice_1: '-1' }).number_choice_1);
  assert.ok(errorsFor({ number_choice_1: '7.5' }).number_choice_1);
  assert.match(errorsFor({ number_choice_3: '7' }).number_choice_3, /different/);
  assert.equal(validateSignup({ ...valid(), number_choice_1: '07', number_choice_2: '8' }).ok, true);
});

test('jersey size must match scale', () => {
  assert.ok(errorsFor({ jersey_scale: 'adult', jersey_size: 'YM' }).jersey_size);
  assert.equal(validateSignup({ ...valid(), jersey_scale: 'adult', jersey_size: '2XL' }).ok, true);
  assert.ok(errorsFor({ jersey_scale: 'kids' }).jersey_scale);
});

test('select-backed fields reject free text', () => {
  for (const k of ['grade', 'years_played', 'avail_bbtl', 'avail_tdc', 'tdc_id_type', 'guardian_relationship', 'contact_pref', 'helmet']) {
    assert.ok(errorsFor({ [k]: 'whatever' })[k], k);
  }
});

test('phones and email', () => {
  assert.ok(errorsFor({ guardian_phone: '555-0100' }).guardian_phone);
  assert.ok(errorsFor({ guardian2_phone: '12345' }).guardian2_phone);
  assert.ok(errorsFor({ guardian_email: 'not-an-email' }).guardian_email);
});

test('dob and weight', () => {
  assert.ok(errorsFor({ dob: '2013-02-30' }).dob);
  assert.ok(errorsFor({ dob: '05/01/2013' }).dob);
  assert.ok(errorsFor({ weight_lbs: '49' }).weight_lbs);
  assert.ok(errorsFor({ weight_lbs: '351' }).weight_lbs);
  // eligibility never blocks: an older DOB is still valid input
  assert.equal(validateSignup({ ...valid(), dob: '2011-01-01' }).ok, true);
});

test('all five acknowledgments required; photo consent optional', () => {
  for (const k of ['ack_gear', 'ack_fee', 'ack_waiver', 'ack_docs', 'ack_accurate']) {
    assert.ok(errorsFor({ [k]: false })[k], k);
    assert.ok(errorsFor({ [k]: 'true' })[k], `${k} must be boolean true`);
  }
  assert.equal(validateSignup({ ...valid(), photo_consent: true }).ok, true);
});
