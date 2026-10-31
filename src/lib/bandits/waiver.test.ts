// Run: npm run test:bandits
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { waiverPdf, waiverValues, waiverFilename, type WaiverPerson } from './waiver.ts';

const bandits = JSON.parse(readFileSync(new URL('../../data/bandits.json', import.meta.url), 'utf8'));
const template = readFileSync(new URL('../../../public/bandits/bbtl-2026-waiver.pdf', import.meta.url));

const person = (first: string, last: string, rel = 'legal_guardian'): WaiverPerson => ({
  player_first: first, player_last: last, guardian_name: ' Test Parent ', guardian_phone: '615-555-0100', guardian_relationship: rel,
});

test('waiver: values use the label, formatted phone, and fixed strings', () => {
  assert.deepEqual(waiverValues(person('Test', 'Player'), bandits.waiver), {
    playerName: 'Test Player',
    guardianPhone: '(615) 555-0100',
    coachTeam: 'Chris Oguin, Wilson County Bandits',
    ageDivision: '13U',
    guardianName: 'Test Parent',
    printedName: 'Test Parent',
    relationship: 'Legal guardian',
  });
});

test('waiver: one page per player, same size as the blank', async () => {
  const bytes = await waiverPdf(template, [person('A', 'Zed'), person('B', 'Able'), person('Ünïcode 😀', 'Ñame')], bandits.waiver);
  const doc = await PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(), 3);
  assert.deepEqual(doc.getPage(0).getSize(), { width: 612, height: 792 });
});

test('waiver: filename', () => {
  assert.equal(waiverFilename({ player_first: 'Test', player_last: "O'Player Jr." }), 'bbtl-waiver-o-player-jr-test.pdf');
});
