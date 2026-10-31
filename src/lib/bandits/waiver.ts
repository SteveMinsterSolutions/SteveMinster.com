// Pre-filled BBTL waivers: stamps player and guardian details onto the blank
// tournament waiver (public/bandits/bbtl-2026-waiver.pdf) with pdf-lib, one page
// per player. Signature and Date stay blank; the form must be signed in ink.
// Works in the browser and on the server: the caller passes the template bytes
// (fetchWaiverTemplate in the browser, or a file read) and the layout from
// bandits.json → waiver. Imports use .ts so the node test runner can load it.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { formatPhone, labelOf, normalizePhone, RELATIONSHIPS } from './validate.ts';
import { byLastName } from './bbtl-roster.ts';

export type WaiverPerson = {
  player_first: string;
  player_last: string;
  guardian_name: string;
  guardian_phone: string;        // digits, or as typed on the form
  guardian_relationship: string; // code, e.g. "legal_guardian"
};

type Spot = { x: number; y: number; w: number };
export type WaiverLayout = {
  coachTeam: string;
  ageDivision: string;
  fontSize: number;
  fields: Record<'playerName' | 'guardianPhone' | 'coachTeam' | 'ageDivision' | 'guardianName' | 'printedName' | 'relationship', Spot>;
};

const MIN_SIZE = 6;

/** Browser: GET the blank waiver. On the server pass an absolute URL, or read the file instead. */
export async function fetchWaiverTemplate(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`waiver_template_${res.status}`);
  return res.arrayBuffer();
}

/** Helvetica (WinAnsi) can't draw every character: strip accents it lacks, drop the rest. */
function drawable(font: PDFFont, text: string) {
  const ok = (s: string) => { try { font.encodeText(s); return true; } catch { return false; } };
  return [...text.normalize('NFC')]
    .map((ch) => (ok(ch) ? ch : ch.normalize('NFD').replace(/\p{M}/gu, '')))
    .filter((ch) => ch && ok(ch))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function stamp(page: PDFPage, font: PDFFont, text: string, spot: Spot, size: number) {
  const t = drawable(font, text);
  if (!t) return;
  const width = font.widthOfTextAtSize(t, size);
  // Long names shrink to fit the line rather than run past it.
  const fit = width > spot.w ? Math.max(MIN_SIZE, size * (spot.w / width)) : size;
  page.drawText(t, { x: spot.x, y: spot.y, size: fit, font, color: rgb(0, 0, 0) });
}

export const waiverValues = (p: WaiverPerson, layout: WaiverLayout) => {
  const guardian = p.guardian_name.trim();
  return {
    playerName: `${p.player_first.trim()} ${p.player_last.trim()}`,
    guardianPhone: formatPhone(normalizePhone(p.guardian_phone)),
    coachTeam: layout.coachTeam,
    ageDivision: layout.ageDivision,
    guardianName: guardian,
    printedName: guardian,
    relationship: labelOf(RELATIONSHIPS, p.guardian_relationship),
  };
};

/** One PDF, one page per player, sorted by last name. */
export async function waiverPdf(template: ArrayBuffer | Uint8Array, people: WaiverPerson[], layout: WaiverLayout): Promise<Uint8Array> {
  const blank = await PDFDocument.load(template);
  const doc = await PDFDocument.create();
  doc.setTitle(people.length === 1 ? `BBTL waiver – ${people[0].player_first} ${people[0].player_last}`.trim() : 'BBTL waivers');
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const sorted = [...people].sort(byLastName);
  const pages = await doc.copyPages(blank, sorted.map(() => 0));
  sorted.forEach((p, i) => {
    const page = doc.addPage(pages[i]);
    const values = waiverValues(p, layout);
    for (const [key, spot] of Object.entries(layout.fields)) {
      stamp(page, font, values[key as keyof typeof values], spot, layout.fontSize);
    }
  });
  return doc.save();
}

/** "bbtl-waiver-player-test.pdf" */
export const waiverFilename = (p: Pick<WaiverPerson, 'player_first' | 'player_last'>) =>
  `bbtl-waiver-${`${p.player_last}-${p.player_first}`.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.pdf`;
