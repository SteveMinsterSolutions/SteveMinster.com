// src/pages/api/wrestling/auth.ts
// POST { pin } → sets the signed scorer cookie (12 h). Constant-time compare, 1 s delay on failure.
// GET → { authed }. DELETE → sign out.
import type { APIRoute } from 'astro';
import { bad, clearSession, hasSession, issueSession, json, pinMatches, readObject } from '../../../lib/wrestling/server';

export const prerender = false;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const POST: APIRoute = async (ctx) => {
  const body = await readObject(ctx.request);
  if (!body) return bad('Invalid request.');
  let ok: boolean;
  try {
    ok = pinMatches(body.pin);
  } catch {
    console.error('wr_auth env');
    return json({ error: 'server', message: 'Scorer sign-in is not configured.' }, 500);
  }
  if (!ok) {
    await sleep(1000);
    console.warn('wr_auth_denied');
    return json({ error: 'wrong_pin', message: 'Wrong PIN.' }, 401);
  }
  try {
    issueSession(ctx);
  } catch {
    console.error('wr_auth secret');
    return json({ error: 'server', message: 'Scorer sign-in is not configured.' }, 500);
  }
  return json({ authed: true });
};

export const GET: APIRoute = async (ctx) => json({ authed: hasSession(ctx) });

export const DELETE: APIRoute = async (ctx) => {
  clearSession(ctx);
  return json({ authed: false });
};
