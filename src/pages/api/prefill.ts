// src/pages/api/prefill.ts
import type { APIRoute } from 'astro';
import packetConfig from '../../sandbox/policy-packet/packet-config.json';
import { normalizeToIso } from '../../components/PolicyPacket/lib/dateHelpers';

export const prerender = false;

// Sonnet 4.6. NOTE: the spec's pinned snapshot id 'claude-sonnet-4-6-20260218'
// returns a 404 not_found_error from the API (date suffixes are not valid on
// this alias) — using the stable alias instead, which is what the API expects.
const MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MAX_TEXT = 200_000; // per-document safety cap (chars)

type Q = { id: string; label: string; type: string; section?: string | number; options?: string[] };

// Built once at module load: every field Claude may fill (exclude computed/derived outputs).
const schema = (packetConfig.questions as Q[])
  .filter((q) => q.type !== 'derived')
  .map((q) => {
    const row: Record<string, unknown> = { id: q.id, label: q.label, type: q.type, section: q.section };
    if (Array.isArray(q.options) && q.options.length) row.options = q.options;
    return row;
  });
const knownIds = new Set(schema.map((q) => q.id as string));
// Date-typed ids — their prefilled values are normalized to canonical YYYY-MM-DD
// on write so the native <input type="date"> can render them (MM/DD/YYYY shows blank).
const dateIds = new Set(schema.filter((q) => q.type === 'date').map((q) => q.id as string));

function clamp(s: unknown): string {
  const t = typeof s === 'string' ? s : '';
  return t.length > MAX_TEXT ? t.slice(0, MAX_TEXT) : t;
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}

export const POST: APIRoute = async ({ request }) => {
  const apiKey = import.meta.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'Server is missing ANTHROPIC_API_KEY.' }, 500);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body.' }, 400); }

  const bindingText = clamp(body?.bindingText);
  const currentText = clamp(body?.currentText);
  if (!bindingText && !currentText) return json({ error: 'No extracted text provided.' }, 400);

  const system = [
    'You extract structured answers from insurance policy packets to pre-fill a questionnaire.',
    'You are given the questionnaire SCHEMA (array of fields) and the extracted text of up to two PDFs:',
    'a BINDING packet (authoritative — what the policy SHOULD say) and a CURRENT packet (the existing,',
    'possibly INCORRECT output). When the two disagree, ALWAYS prefer the BINDING packet.',
    'Return ONLY a single JSON object mapping field "id" -> value. No prose, no markdown, no code fences.',
    'Rules:',
    '- Include a field ONLY if you find a confident value in the text. OMIT anything uncertain — never guess.',
    '- type "dropdown": the value MUST be EXACTLY one of that field\'s "options" strings, or omit the field.',
    '- type "Currency" / currency values: format as "$1,234" (leading $, thousands commas, no cents unless present).',
    '- type "date": use ISO format YYYY-MM-DD.',
    '- Do NOT include derived/computed fields, totals, or taxes — those are recalculated downstream.',
    '- All values are strings.',
  ].join('\n');

  const user = [
    'QUESTIONNAIRE SCHEMA (JSON):',
    JSON.stringify(schema),
    '',
    '=== BINDING PACKET (authoritative) ===',
    bindingText || '(none provided)',
    '',
    '=== CURRENT PACKET (existing output, may be incorrect) ===',
    currentText || '(none provided)',
  ].join('\n');

  let resp: Response;
  try {
    resp = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        temperature: 0,
        system,
        // NOTE: assistant-message prefill (the original spec's `{role:'assistant',
        // content:'{'}` turn) is rejected by Sonnet 4.6 with a 400. The system
        // prompt already mandates a bare JSON object, so we rely on that and
        // robustly extract the object from the response below.
        messages: [
          { role: 'user', content: user },
        ],
      }),
    });
  } catch {
    return json({ error: 'Failed to reach the model API.' }, 502);
  }

  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    return json({ error: 'Model API error.', status: resp.status, detail: detail.slice(0, 500) }, 502);
  }

  const data = await resp.json();
  const text = (data?.content ?? [])
    .filter((b: any) => b?.type === 'text')
    .map((b: any) => b.text)
    .join('');

  let parsed: any;
  try {
    // Strip any accidental code fences, then extract the JSON object span.
    const fenced = text.replace(/```json|```/g, '').trim();
    const start = fenced.indexOf('{');
    const end = fenced.lastIndexOf('}');
    const raw = start !== -1 && end !== -1 ? fenced.slice(start, end + 1) : fenced;
    parsed = JSON.parse(raw);
  } catch {
    return json({ error: 'Could not parse model output as JSON.' }, 502);
  }
  if (!parsed || typeof parsed !== 'object') return json({ error: 'Model returned non-object JSON.' }, 502);

  // Keep only known ids; coerce to strings.
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (!knownIds.has(k) || v === null || v === undefined) continue;
    cleaned[k] = dateIds.has(k) ? normalizeToIso(String(v)) : String(v);
  }

  // -00 policy-number rule: append when read from upload and not already suffixed.
  if (cleaned.Policy_Number && !/-\d{2}$/.test(cleaned.Policy_Number)) {
    cleaned.Policy_Number = `${cleaned.Policy_Number}-00`;
  }

  return json({ answers: cleaned, prefilledIds: Object.keys(cleaned) }, 200);
};
