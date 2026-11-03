// Run: npm run test:wrestling
// Fake data only ("Test Wrestler"). Never put real names in tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_CODES, EVENT_POINTS, WEIGHTS, type EventCode, type Period, type Side } from './constants.ts';
import {
  boutScore, buildBouts, classifyMargin, crossesTechFall, dualScore, endOnPoints,
  lastActiveEvent, pointsFor, resultFor, varsityOrder, voidEvent, type DualBout, type WrEvent,
} from './scoring.ts';
import { buildPublicDual, firstNameOnly } from './snapshot.ts';

let n = 0;
const ev = (side: Side, code: EventCode, period: Period = 'P1'): WrEvent => {
  n += 1;
  return {
    id: `e${n}`, period, side, code, points: EVENT_POINTS[code], voided: false,
    created_at: `2026-11-03T18:00:${String(n % 60).padStart(2, '0')}.${String(n).padStart(3, '0')}Z`,
  };
};
/** Events that add up to exactly `pts` for `side` (T3s, then one E1/R2 for the rest). */
const pts = (side: Side, total: number, period: Period = 'P1'): WrEvent[] => {
  const out: WrEvent[] = [];
  let left = total;
  while (left >= 3) { out.push(ev(side, 'T3', period)); left -= 3; }
  if (left === 2) out.push(ev(side, 'R2', period));
  if (left === 1) out.push(ev(side, 'E1', period));
  return out;
};

// ─── Codes ───────────────────────────────────────────────────────────────────

test('event codes match the wr_events check constraint exactly', () => {
  assert.deepEqual(EVENT_CODES, ['T3', 'E1', 'R2', 'N2', 'N3', 'N4', 'N5', 'PEN1', 'PEN2', 'RO1', 'SW', 'C']);
  assert.equal(pointsFor('N5'), 5);
  assert.equal(pointsFor('SW'), 0);
  assert.equal(pointsFor('X9'), null);
  assert.equal(pointsFor('toString'), null);
});

// ─── README §6 minimum tests ─────────────────────────────────────────────────

test('T3+N3 vs R2, then E1 → 7–2, DEC, 3 team pts', () => {
  const events = [ev('us', 'T3'), ev('us', 'N3'), ev('them', 'R2', 'P2'), ev('us', 'E1', 'P3')];
  const s = boutScore(events);
  assert.equal(s.us, 7);
  assert.equal(s.them, 2);
  assert.deepEqual(s.byPeriod, [
    { period: 'P1', us: 6, them: 0 },
    { period: 'P2', us: 0, them: 2 },
    { period: 'P3', us: 1, them: 0 },
  ]);
  const end = endOnPoints(events, 'P3');
  assert.ok(end.ok);
  assert.deepEqual(end.result, { result_type: 'DEC', winner: 'us', team_pts_us: 3, team_pts_them: 0 });
});

test('10–2 → MD, 4 team pts', () => {
  const end = endOnPoints([...pts('us', 10), ...pts('them', 2)], 'P3');
  assert.ok(end.ok);
  assert.equal(end.result.result_type, 'MD');
  assert.equal(end.result.team_pts_us, 4);
});

test('17–2 → TF, 5 team pts', () => {
  const end = endOnPoints([...pts('us', 17), ...pts('them', 2)], 'P3');
  assert.ok(end.ok);
  assert.equal(end.result.result_type, 'TF');
  assert.equal(end.result.team_pts_us, 5);
});

test('12–0 + T3 → tech-fall prompt at 15', () => {
  const before = boutScore(pts('us', 12));
  const after = boutScore([...pts('us', 12), ev('us', 'T3')]);
  assert.equal(after.us, 15);
  assert.equal(crossesTechFall(before, after), true);
});

test('tech-fall prompt fires once: near fall after 15 does not re-prompt', () => {
  assert.equal(crossesTechFall({ us: 15, them: 0 }, { us: 18, them: 0 }), false);
  assert.equal(crossesTechFall({ us: 12, them: 0 }, { us: 14, them: 0 }), false);
  assert.equal(crossesTechFall({ us: 0, them: 12 }, { us: 0, them: 15 }), true, 'works for them too');
});

test('12–0, T3 into N3 held, criteria end → 18–0 TF', () => {
  const end = endOnPoints([...pts('us', 12), ev('us', 'T3'), ev('us', 'N3')], 'P2');
  assert.ok(end.ok);
  assert.deepEqual(end.score, { us: 18, them: 0 });
  assert.equal(end.result.result_type, 'TF');
});

test('FALL → 6 to the winner', () => {
  assert.deepEqual(resultFor('FALL', 'them'), { result_type: 'FALL', winner: 'them', team_pts_us: 0, team_pts_them: 6 });
  for (const r of ['FOR', 'DEF', 'DQ'] as const) assert.equal(resultFor(r, 'us').team_pts_us, 6);
});

test('DFF → 0/0, no winner', () => {
  assert.deepEqual(resultFor('DFF', 'us'), { result_type: 'DFF', winner: null, team_pts_us: 0, team_pts_them: 0 });
  assert.throws(() => resultFor('FALL', null));
});

const vb = (us: number, them: number, status: DualBout['status'] = 'final'): DualBout =>
  ({ level: 'V', status, team_pts_us: us, team_pts_them: them });

test('JV bout does not change the dual score', () => {
  const v = [vb(6, 0), vb(0, 3)];
  const withJv = [...v, { level: 'JV', status: 'final', team_pts_us: 6, team_pts_them: 0 } as DualBout];
  assert.deepEqual(
    { us: dualScore(withJv).us, them: dualScore(withJv).them },
    { us: dualScore(v).us, them: dualScore(v).them },
  );
  assert.equal(dualScore(withJv).us, 6);
});

test('team deduction subtracts from the penalized side; negatives allowed', () => {
  const s = dualScore([vb(0, 3)], [{ side: 'us', points: 1 }, { side: 'them', points: 2 }]);
  assert.equal(s.us, -1);
  assert.equal(s.them, 1);
});

test('wraparound order from 122', () => {
  assert.deepEqual(varsityOrder(122), [122, 130, 138, 145, 155, 170, 185, 215, 260, 75, 82, 90, 98, 106, 114]);
  assert.deepEqual(varsityOrder(75), [...WEIGHTS]);
});

test('void restores the prior score (Undo)', () => {
  const events = [ev('us', 'T3'), ev('them', 'E1'), ev('us', 'N2')];
  const before = boutScore(events.slice(0, 2));
  const last = lastActiveEvent(events)!;
  assert.equal(last.code, 'N2');
  const undone = voidEvent(events, last.id);
  const after = boutScore(undone);
  assert.deepEqual({ us: after.us, them: after.them }, { us: before.us, them: before.them });
  // a second Undo goes one further back
  assert.equal(lastActiveEvent(undone)!.code, 'E1');
});

// ─── Extra coverage ──────────────────────────────────────────────────────────

test('classify boundaries: 7 DEC, 8 MD, 14 MD, 15 TF', () => {
  assert.equal(classifyMargin(1), 'DEC');
  assert.equal(classifyMargin(7), 'DEC');
  assert.equal(classifyMargin(8), 'MD');
  assert.equal(classifyMargin(14), 'MD');
  assert.equal(classifyMargin(15), 'TF');
  assert.throws(() => classifyMargin(0));
});

test('tied bout cannot end on points; UTB tie asks for ride-out', () => {
  const tied = [ev('us', 'T3'), ev('them', 'E1'), ev('them', 'R2')];
  const p3 = endOnPoints(tied, 'P3');
  assert.equal(p3.ok, false);
  assert.equal(!p3.ok && p3.needsRideOut, false);
  const utb = endOnPoints(tied, 'UTB');
  assert.equal(!utb.ok && utb.needsRideOut, true);
});

test('0–0 through UTB, RO1 to the offensive wrestler → 1–0 DEC', () => {
  const end = endOnPoints([ev('them', 'RO1', 'UTB')], 'UTB');
  assert.ok(end.ok);
  assert.deepEqual(end.score, { us: 0, them: 1 });
  assert.deepEqual(end.result, { result_type: 'DEC', winner: 'them', team_pts_us: 0, team_pts_them: 3 });
});

test('SW and C are log-only; penalty points count', () => {
  const s = boutScore([ev('us', 'SW'), ev('us', 'C'), ev('us', 'PEN1'), ev('them', 'PEN2')]);
  assert.deepEqual({ us: s.us, them: s.them }, { us: 1, them: 2 });
  assert.equal(s.byPeriod.length, 1);
});

test('events are summed in recorded order regardless of arrival order', () => {
  const a = ev('us', 'T3'), b = ev('us', 'N2');
  assert.equal(lastActiveEvent([b, a])!.id, b.id);
});

test('dual tied when varsity done → needs tiebreak; tiebreak adds 1', () => {
  const bouts = [vb(6, 0), vb(0, 6), vb(0, 0, 'skipped')];
  const s = dualScore(bouts);
  assert.equal(s.varsityDone, true);
  assert.equal(s.needsTiebreak, true);
  const t = dualScore(bouts, [], 'us');
  assert.deepEqual({ us: t.us, them: t.them, needsTiebreak: t.needsTiebreak }, { us: 7, them: 6, needsTiebreak: false });
  assert.equal(dualScore([vb(6, 0), vb(0, 6), vb(0, 0, 'pending')]).needsTiebreak, false, 'not done yet');
  assert.equal(dualScore([vb(6, 0), vb(0, 0, 'live')]).us, 6, 'only final bouts count');
});

test('buildBouts: 15 varsity in wrap order, JV after in weight order', () => {
  const roster = [
    { id: 'v122', default_weight: 122, level: 'V' as const, active: true },
    { id: 'v75', default_weight: 75, level: 'V' as const, active: true },
    { id: 'v75b', default_weight: 75, level: 'V' as const, active: true },   // extra at 75 → exhibition
    { id: 'jv98', default_weight: 98, level: 'JV' as const, active: true },
    { id: 'jv82', default_weight: 82, level: 'JV' as const, active: true },
    { id: 'jvx', default_weight: null, level: 'JV' as const, active: true },  // no weight → unplaced
    { id: 'gone', default_weight: 130, level: 'V' as const, active: false },
  ];
  const { bouts, unplaced } = buildBouts(roster, 122);
  const v = bouts.filter((b) => b.level === 'V');
  assert.equal(v.length, 15);
  assert.deepEqual(v.map((b) => b.weight), varsityOrder(122));
  assert.equal(v[0].our_wrestler_id, 'v122');
  assert.equal(v.find((b) => b.weight === 75)!.our_wrestler_id, 'v75');
  assert.equal(v.find((b) => b.weight === 130)!.our_wrestler_id, null, 'inactive wrestler not placed');
  const jv = bouts.filter((b) => b.level === 'JV');
  assert.deepEqual(jv.map((b) => [b.weight, b.our_wrestler_id]), [[75, 'v75b'], [82, 'jv82'], [98, 'jv98']]);
  assert.deepEqual(jv.map((b) => b.bout_order), [16, 17, 18]);
  assert.deepEqual(unplaced, ['jvx']);
  const keys = new Set(bouts.map((b) => `${b.level}-${b.weight}-${b.bout_order}`));
  assert.equal(keys.size, bouts.length, 'unique (level, weight, bout_order)');
});

// ─── Public snapshot ─────────────────────────────────────────────────────────

test('public snapshot: first names only, no last names, JV excluded from score', () => {
  const wrestlers = [
    { id: 'w1', first_name: 'Test', last_name: 'Wrestler-LASTNAME' },
    { id: 'w2', first_name: 'Sample', last_name: 'Kid-LASTNAME' },
  ];
  const t = '2026-11-03T18:00:00.000Z';
  const bout = (id: string, level: 'V' | 'JV', weight: number, order: number, wid: string, extra = {}) => ({
    id, level, weight, bout_order: order, our_wrestler_id: wid, opp_name: 'Opp Fullname-LASTNAME',
    status: 'final' as const, current_period: 'P3' as const, result_type: 'DEC' as const, winner: 'us' as const,
    result_time: '4:25', team_pts_us: 3, team_pts_them: 0, updated_at: t, ...extra,
  });
  const snap = buildPublicDual(
    { id: 'd1', dual_date: '2026-11-03', opponent: 'Test Opponent', location: null, status: 'live',
      tiebreak_side: null, tiebreak_criterion: null, updated_at: t },
    [bout('jv', 'JV', 90, 16, 'w2'), bout('b1', 'V', 122, 1, 'w1'),
     bout('b2', 'V', 130, 2, 'w2', { status: 'live', result_type: null, winner: null, team_pts_us: 0 })],
    [{ ...ev('us', 'T3'), bout_id: 'b2', created_at: '2026-11-03T18:05:00.000Z' }],
    wrestlers,
    [],
  );
  const json = JSON.stringify(snap);
  assert.ok(!json.includes('LASTNAME'), 'no last names anywhere in the payload');
  assert.ok(!json.includes('last_name'));
  assert.ok(!json.includes('4:25'), 'result_time only for FALL/TF');
  assert.deepEqual(snap.bouts.map((b) => b.id), ['b1', 'b2', 'jv'], 'varsity first, then JV');
  assert.equal(snap.bouts[0].our_name, 'Test');
  assert.equal(snap.bouts[0].opp_name, 'Opp');
  assert.equal(snap.live_bout_id, 'b2');
  assert.deepEqual({ us: snap.bouts[1].score.us, them: snap.bouts[1].score.them }, { us: 3, them: 0 });
  assert.equal(snap.score.us, 3, 'JV win not counted');
  assert.equal(snap.updated_at, '2026-11-03T18:05:00.000Z');
});

test('firstNameOnly', () => {
  assert.equal(firstNameOnly('  Test   Wrestler '), 'Test');
  assert.equal(firstNameOnly(''), null);
  assert.equal(firstNameOnly(null), null);
});

// ─── Follow-page text ────────────────────────────────────────────────────────
import { agoClock, leadLine, resultLine } from './format.ts';
import type { PublicBout } from './snapshot.ts';

const pb = (o: Partial<PublicBout>): PublicBout => ({
  id: 'x', level: 'V', weight: 122, order: 1, status: 'final', period: 'P3',
  our_name: 'Test', opp_name: 'Sam', score: { us: 0, them: 0, byPeriod: [] },
  result_type: 'DEC', winner: 'us', result_time: null, team_pts_us: 0, team_pts_them: 0, ...o,
});

test('result lines', () => {
  assert.equal(resultLine(pb({ result_type: 'MD', score: { us: 11, them: 3, byPeriod: [] }, team_pts_us: 4 }), 'Opp'),
    '122 · Test def. Sam · MD 11–3 · +4 Warriors');
  assert.equal(resultLine(pb({ weight: 106, result_type: 'FALL', winner: 'them', result_time: '1:38', team_pts_them: 6 }), 'Opp'),
    '106 · Sam def. Test · Fall 1:38 · +6 Opp');
  assert.equal(resultLine(pb({ weight: 90, result_type: 'FOR', opp_name: null, team_pts_us: 6 }), 'Opp'),
    '90 · Test by forfeit · +6 Warriors');
  assert.equal(resultLine(pb({ weight: 260, result_type: 'FOR', winner: 'them', our_name: null, opp_name: null, team_pts_them: 6 }), 'Opp'),
    '260 · Opp by forfeit · +6 Opp');
  assert.equal(resultLine(pb({ result_type: 'DFF', winner: null }), 'Opp'), '122 · Double forfeit');
  assert.equal(resultLine(pb({ level: 'JV', result_type: 'DEC', score: { us: 4, them: 2, byPeriod: [] }, team_pts_us: 3 }), 'Opp'),
    '122 · Test def. Sam · Dec 4–2 · Exhibition');
});

test('lead line and clock', () => {
  assert.equal(leadLine(24, 18, 'Opp'), 'Warriors lead by 6');
  assert.equal(leadLine(18, 24, 'Opp'), 'Opp leads by 6');
  assert.equal(leadLine(3, 3, 'Opp'), 'Tied');
  assert.equal(agoClock(3200), '0:03');
  assert.equal(agoClock(75000), '1:15');
});
