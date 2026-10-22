// CSV building for the coach exports (README §7).
// Cells that start with = + - @ (or tab / CR) get a leading ' so a spreadsheet
// never evaluates parent-typed free text as a formula.

export function csvCell(value: unknown): string {
  let s = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** UTF-8 BOM so Excel reads en dashes and accents correctly; CRLF line endings. */
export const toCsv = (rows: unknown[][]) => '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
