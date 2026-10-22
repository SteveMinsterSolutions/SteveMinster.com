// src/pages/api/bandits/coach/export.ts
// GET (staff) ?type=bbtl|full|contacts → CSV attachment (README §7).
// Downloaded by the dashboard via fetch + Blob (the route needs the Authorization header).
import type { APIRoute } from 'astro';
import bandits from '../../../../data/bandits.json';
import { requireStaff } from '../../../../lib/bandits/staff-auth';
import { supabaseServer } from '../../../../lib/bandits/supabase-server';
import { toCsv } from '../../../../lib/bandits/csv';
import { chicagoToday } from '../../../../lib/bandits/dates';
import {
  labelOf, jerseyLabel, formatPhone, GRADES, YEARS_PLAYED, HELMET, AVAILABILITY, TDC_ID_TYPES, RELATIONSHIPS, CONTACT_PREFS,
} from '../../../../lib/bandits/validate';

export const prerender = false;

type Row = Record<string, any>;

const STATUS_ORDER: Record<string, number> = { rostered: 0, waitlist: 1, withdrawn: 2 };
const yesNo = (b: boolean) => (b ? 'Yes' : 'No');
/** 2013-05-01 → 05/01/2013 */
const usDate = (iso: string) => `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}`;
const byLastName = (a: Row, b: Row) =>
  a.player_last.localeCompare(b.player_last, 'en', { sensitivity: 'base' }) ||
  a.player_first.localeCompare(b.player_first, 'en', { sensitivity: 'base' });

// Tournament roster format: rostered only, by last name. Coaches listed above the table.
function bbtl(rows: Row[]) {
  const roster = rows.filter((r) => r.status === 'rostered').sort(byLastName);
  return [
    [`Head Coach: ${bandits.headCoach}`],
    [],
    ['Name', 'Jersey #', 'Birthdate', 'Weight'],
    ...roster.map((r) => [`${r.player_first} ${r.player_last}`, r.assigned_number ?? '', usDate(r.dob), r.weight_lbs]),
  ];
}

// Every column, coded values shown as their labels.
const FULL: [string, (r: Row) => unknown][] = [
  ['Signup #', (r) => r.signup_seq],
  ['Status', (r) => r.status],
  ['Signed up', (r) => r.created_at],
  ['First name', (r) => r.player_first],
  ['Last name', (r) => r.player_last],
  ['Birthdate', (r) => usDate(r.dob)],
  ['Grade', (r) => labelOf(GRADES, r.grade)],
  ['School', (r) => r.school],
  ['Weight (lbs)', (r) => r.weight_lbs],
  ['Years played', (r) => labelOf(YEARS_PLAYED, r.years_played)],
  ['Positions', (r) => r.positions],
  ['Eligibility flag', (r) => r.eligibility_flag],
  ['Jersey size', (r) => jerseyLabel(r.jersey_scale, r.jersey_size)],
  ['Number choice 1', (r) => r.number_choice_1],
  ['Number choice 2', (r) => r.number_choice_2],
  ['Number choice 3', (r) => r.number_choice_3],
  ['Assigned #', (r) => r.assigned_number],
  ['Helmet', (r) => labelOf(HELMET, r.helmet)],
  ['BBTL availability', (r) => labelOf(AVAILABILITY, r.avail_bbtl)],
  ['TDC availability', (r) => labelOf(AVAILABILITY, r.avail_tdc)],
  ['TDC ID type', (r) => labelOf(TDC_ID_TYPES, r.tdc_id_type)],
  ['Guardian', (r) => r.guardian_name],
  ['Relationship', (r) => labelOf(RELATIONSHIPS, r.guardian_relationship)],
  ['Guardian phone', (r) => formatPhone(r.guardian_phone)],
  ['Guardian email', (r) => r.guardian_email],
  ['Second guardian', (r) => r.guardian2_name],
  ['Second guardian phone', (r) => (r.guardian2_phone ? formatPhone(r.guardian2_phone) : '')],
  ['Contact preference', (r) => labelOf(CONTACT_PREFS, r.contact_pref)],
  ['Emergency contact', (r) => r.emergency_name],
  ['Emergency phone', (r) => formatPhone(r.emergency_phone)],
  ['Emergency relationship', (r) => r.emergency_relationship],
  ['Health notes', (r) => r.health_notes],
  ['Photo consent', (r) => yesNo(r.photo_consent)],
  ['Paid', (r) => yesNo(r.paid)],
  ['Waiver received', (r) => yesNo(r.waiver_received)],
  ['Birth certificate received', (r) => yesNo(r.birth_cert_received)],
  ['TDC ID received', (r) => yesNo(r.tdc_id_received)],
  ['8th-grade proof received', (r) => yesNo(r.grade_proof_received)],
  ['Loaner assigned', (r) => yesNo(r.loaner_assigned)],
  ['Staff notes', (r) => r.staff_notes],
  ['Updated', (r) => r.updated_at],
];
const full = (rows: Row[]) => [FULL.map(([h]) => h), ...rows.map((r) => FULL.map(([, f]) => f(r)))];

// Group text / email list: rostered + waitlisted families.
const contacts = (rows: Row[]) => [
  ['Player', 'Status', 'Guardian', 'Phone', 'Email'],
  ...rows
    .filter((r) => r.status !== 'withdrawn')
    .map((r) => [`${r.player_first} ${r.player_last}`, r.status, r.guardian_name, formatPhone(r.guardian_phone), r.guardian_email]),
];

const BUILDERS: Record<string, { build: (rows: Row[]) => unknown[][]; name: string }> = {
  bbtl: { build: bbtl, name: 'bbtl-roster' },
  full: { build: full, name: 'full' },
  contacts: { build: contacts, name: 'contacts' },
};

export const GET: APIRoute = async ({ request, url }) => {
  const staff = await requireStaff(request);
  if (staff instanceof Response) return staff;

  const type = url.searchParams.get('type') ?? '';
  const builder = BUILDERS[type];
  if (!builder) {
    return new Response(JSON.stringify({ error: 'invalid', message: 'Unknown export type.' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await supabaseServer().from('bandits_signups').select('*').order('signup_seq');
  if (error) {
    console.error('export_failed', type, error.code);
    return new Response(JSON.stringify({ error: 'server' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  const rows = [...data].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.signup_seq - b.signup_seq);

  const filename = `bandits-${builder.name}-${chicagoToday()}.csv`;
  return new Response(toCsv(builder.build(rows)), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
};
