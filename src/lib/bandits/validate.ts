// Shared sign-up validation (README §7) — imported by SignupForm (browser) and
// POST /api/bandits/register (server), so both enforce identical rules.
// Select-backed fields store short codes; the labels below are what families see
// on the form and what the dashboard, CSVs and Make payload show.

export type Option = { value: string; label: string };
const opts = (pairs: [string, string][]): Option[] => pairs.map(([value, label]) => ({ value, label }));

export const GRADES = opts([['6th', '6th'], ['7th', '7th'], ['8th', '8th'], ['Other', 'Other']]);
export const YEARS_PLAYED = opts([['first', 'First season'], ['1_2', '1–2'], ['3_4', '3–4'], ['5_plus', '5+']]);
export const JERSEY_SIZES = {
  youth: opts([['YS', 'Youth S'], ['YM', 'Youth M'], ['YL', 'Youth L'], ['YXL', 'Youth XL']]),
  adult: opts([['S', 'Adult S'], ['M', 'Adult M'], ['L', 'Adult L'], ['XL', 'Adult XL'], ['2XL', 'Adult 2XL'], ['3XL', 'Adult 3XL']]),
};
export const HELMET = opts([['own', 'We have our own helmet'], ['loaner', 'Please request a loaner (limited, not guaranteed)']]);
export const AVAILABILITY = opts([['yes_all', 'Yes, all weekend'], ['partial', 'Part of the weekend'], ['unsure', 'Not sure yet'], ['no', "Can't attend"]]);
export const TDC_ID_TYPES = opts([['nsid', 'National Sports ID (NSID)'], ['state_id', 'State ID'], ['passport', 'Passport'], ['none_yet', "Don't have one yet"]]);
export const RELATIONSHIPS = opts([['mother', 'Mother'], ['father', 'Father'], ['legal_guardian', 'Legal guardian'], ['other', 'Other']]);
export const CONTACT_PREFS = opts([['text', 'Text'], ['email', 'Email'], ['call', 'Phone call']]);

/** The five required acknowledgments (gear + the four in "Before you submit"); not stored. */
export const REQUIRED_ACKS = ['ack_gear', 'ack_fee', 'ack_waiver', 'ack_docs', 'ack_accurate'] as const;

export const labelOf = (list: Option[], value: string | null | undefined) =>
  list.find((o) => o.value === value)?.label ?? value ?? '';

export const jerseyLabel = (scale: string, size: string) =>
  labelOf(scale === 'adult' ? JERSEY_SIZES.adult : JERSEY_SIZES.youth, size);

/** (615) 555-0100 */
export const formatPhone = (digits: string) =>
  digits.length === 10 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : digits;

/** Insert payload for bandits_register (eligibility_flag is added by the server). */
export type SignupPayload = {
  player_first: string; player_last: string; dob: string; grade: string; school: string | null;
  weight_lbs: number; years_played: string | null; positions: string | null;
  jersey_scale: 'youth' | 'adult'; jersey_size: string;
  number_choice_1: number; number_choice_2: number; number_choice_3: number;
  helmet: string; avail_bbtl: string; avail_tdc: string; tdc_id_type: string;
  guardian_name: string; guardian_relationship: string; guardian_phone: string; guardian_email: string;
  guardian2_name: string | null; guardian2_phone: string | null; contact_pref: string | null;
  emergency_name: string; emergency_phone: string; emergency_relationship: string | null;
  health_notes: string | null; photo_consent: boolean;
};

export type FieldErrors = Record<string, string>;
export type Validation = { ok: true; data: SignupPayload } | { ok: false; errors: FieldErrors };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const NUMBER_FIELDS = ['number_choice_1', 'number_choice_2', 'number_choice_3'] as const;

/** Digits only, US 10-digit; a leading country code 1 is dropped. */
export const normalizePhone = (raw: string) => {
  const d = raw.replace(/\D/g, '');
  return d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
};

/** Validate raw form values (strings/booleans from the form or the request body). */
export function validateSignup(input: Record<string, unknown>): Validation {
  const errors: FieldErrors = {};
  const str = (k: string) => (typeof input[k] === 'string' || typeof input[k] === 'number' ? String(input[k]).trim() : '');
  const opt = (k: string) => str(k) || null;

  const required = (k: string, msg: string, max = 100) => {
    const v = str(k);
    if (!v) errors[k] = msg;
    else if (v.length > max) errors[k] = `Please keep this under ${max} characters.`;
    return v;
  };
  const optional = (k: string, max: number) => {
    const v = opt(k);
    if (v && v.length > max) errors[k] = `Please keep this under ${max} characters.`;
    return v;
  };
  const oneOf = (k: string, list: Option[], msg: string, isRequired = true) => {
    const v = str(k);
    if (!v) { if (isRequired) errors[k] = msg; return null; }
    if (!list.some((o) => o.value === v)) errors[k] = msg;
    return v;
  };
  const phone = (k: string, isRequired: boolean) => {
    const v = str(k);
    if (!v) { if (isRequired) errors[k] = 'Enter a phone number.'; return null; }
    const d = normalizePhone(v);
    if (d.length !== 10) errors[k] = 'Enter a 10-digit US phone number.';
    return d;
  };

  // player
  const player_first = required('player_first', "Enter the player's first name.", 60);
  const player_last = required('player_last', "Enter the player's last name.", 60);
  const dob = str('dob');
  const realDate = DATE_RE.test(dob) && new Date(`${dob}T00:00:00Z`).toISOString().slice(0, 10) === dob; // rejects Feb 30
  if (!realDate || dob < '2000-01-01' || dob > '2025-12-31') {
    errors.dob = 'Enter a valid date of birth.';
  }
  const grade = oneOf('grade', GRADES, 'Choose a grade.')!;
  const school = optional('school', 100);
  const weightRaw = str('weight_lbs');
  const weight_lbs = Number(weightRaw);
  if (!/^\d{2,3}$/.test(weightRaw) || weight_lbs < 50 || weight_lbs > 350) errors.weight_lbs = 'Enter a weight from 50 to 350 lbs.';
  const years_played = oneOf('years_played', YEARS_PLAYED, 'Choose from the list.', false);
  const positions = optional('positions', 60);

  // uniform
  const jersey_scale = str('jersey_scale') === 'adult' ? 'adult' : str('jersey_scale') === 'youth' ? 'youth' : null;
  if (!jersey_scale) errors.jersey_scale = 'Choose Youth or Adult.';
  const jersey_size = oneOf('jersey_size', JERSEY_SIZES[jersey_scale ?? 'youth'], 'Choose a jersey size.')!;
  const numbers = NUMBER_FIELDS.map((k) => {
    const v = str(k);
    if (v === '00') { errors[k] = "Choose 0–99; 00 isn't available."; return NaN; }
    if (!/^\d{1,2}$/.test(v)) { errors[k] = 'Enter a number from 0 to 99.'; return NaN; }
    return Number(v);
  });
  NUMBER_FIELDS.forEach((k, i) => {
    if (!errors[k] && numbers.indexOf(numbers[i]) !== i) errors[k] = 'Pick three different numbers.';
  });

  // gear & availability
  const helmet = oneOf('helmet', HELMET, 'Choose own helmet or loaner.')!;
  const avail_bbtl = oneOf('avail_bbtl', AVAILABILITY, 'Choose an answer.')!;
  const avail_tdc = oneOf('avail_tdc', AVAILABILITY, 'Choose an answer.')!;
  const tdc_id_type = oneOf('tdc_id_type', TDC_ID_TYPES, 'Choose an ID type.')!;

  // guardian & emergency
  const guardian_name = required('guardian_name', 'Enter your full name.');
  const guardian_relationship = oneOf('guardian_relationship', RELATIONSHIPS, 'Choose your relationship to the player.')!;
  const guardian_phone = phone('guardian_phone', true)!;
  const guardian_email = str('guardian_email').toLowerCase();
  if (!EMAIL_RE.test(guardian_email) || guardian_email.length > 254) errors.guardian_email = 'Enter a valid email address.';
  const guardian2_name = optional('guardian2_name', 100);
  const guardian2_phone = phone('guardian2_phone', false);
  const contact_pref = oneOf('contact_pref', CONTACT_PREFS, 'Choose from the list.', false);
  const emergency_name = required('emergency_name', "Enter the emergency contact's name.");
  const emergency_phone = phone('emergency_phone', true)!;
  const emergency_relationship = optional('emergency_relationship', 60);
  const health_notes = optional('health_notes', 1000);

  for (const k of REQUIRED_ACKS) if (input[k] !== true) errors[k] = 'Please check this box to continue.';
  const photo_consent = input.photo_consent === true;

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      player_first, player_last, dob, grade, school, weight_lbs, years_played, positions,
      jersey_scale: jersey_scale!, jersey_size,
      number_choice_1: numbers[0], number_choice_2: numbers[1], number_choice_3: numbers[2],
      helmet, avail_bbtl, avail_tdc, tdc_id_type,
      guardian_name, guardian_relationship, guardian_phone, guardian_email,
      guardian2_name, guardian2_phone, contact_pref,
      emergency_name, emergency_phone, emergency_relationship, health_notes, photo_consent,
    },
  };
}
