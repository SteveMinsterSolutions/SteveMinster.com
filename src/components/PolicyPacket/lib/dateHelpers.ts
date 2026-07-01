// Format-preserving date math for the questionnaire date fields.
//
// The Account Information step stores Policy_Effective_Date / Policy_Expiration_Date
// as either an ISO `YYYY-MM-DD` string (what `<input type="date">` emits) or a US
// `MM/DD/YYYY` string (what the PDF prefill may supply). addOneYear detects which
// format it was handed and returns the same format, so it can be used to default
// expiration = effective + 1 year without reformatting whatever the field holds.

// Normalize a date string to canonical YYYY-MM-DD for storage + display. A native
// <input type="date"> only renders strict YYYY-MM-DD, so prefilled dates must be
// coerced to that shape on write. Idempotent on already-ISO input; accepts US
// MM/DD/YYYY and ISO-with-time (e.g. '2026-01-01T00:00:00'). An unrecognized value
// is returned verbatim — surfaces a bad extraction rather than crashing.
export function normalizeToIso(dateStr: string): string {
  if (!dateStr) return dateStr;
  const s = dateStr.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(s); // ISO date, optional time
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s); // US MM/DD/YYYY
  if (us) {
    const p = (n: string) => n.padStart(2, '0');
    return `${us[3]}-${p(us[1])}-${p(us[2])}`;
  }
  return dateStr; // unrecognized -> leave as-is (blank input + lit badge flags it)
}

// addOneYear('01/15/2026') -> '01/15/2027'; preserves MM/DD/YYYY or YYYY-MM-DD; clamps 02/29 -> 02/28
export function addOneYear(dateStr: string): string {
  if (!dateStr) return '';
  const s = dateStr.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  let y: number, m: number, d: number, isIso = false;
  if (iso) { isIso = true; y = +iso[1]; m = +iso[2]; d = +iso[3]; }
  else if (us) { m = +us[1]; d = +us[2]; y = +us[3]; }
  else return ''; // unrecognized -> caller leaves expiration untouched
  const ny = y + 1;
  const lastDay = new Date(ny, m, 0).getDate(); // last valid day of month m in year ny
  const nd = Math.min(d, lastDay);
  const p = (n: number) => String(n).padStart(2, '0');
  return isIso ? `${ny}-${p(m)}-${p(nd)}` : `${p(m)}/${p(nd)}/${ny}`;
}
