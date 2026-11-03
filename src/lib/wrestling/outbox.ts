// Warriors wrestling: browser-side write outbox. Every scorer write goes into a
// localStorage queue and is sent in order until the server acknowledges it, so a
// dropped gym Wi-Fi never loses a tap. Event ids are client-generated, so a replay
// after a lost response is harmless (the API upserts by id).
//
// Rules: network error or 5xx → keep, retry with backoff. 401 → pause until the
// scorer re-enters the PIN. Other 4xx → drop (the request can never succeed) and
// report it.

export interface Op {
  opId: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  path: string;          // /api/wrestling/...
  body: unknown;
  label: string;         // short human text for error reports
}

type Listener = (s: OutboxState) => void;
export interface OutboxState {
  pending: number;
  online: boolean;       // last attempt reached the server
  needsAuth: boolean;
  lastError: string | null;
}

const KEY = 'wr_outbox_v1';

const load = (): Op[] => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
};

export class Outbox {
  private ops: Op[] = load();
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private backoff = 1000;
  private listeners = new Set<Listener>();
  state: OutboxState = { pending: this.ops.length, online: true, needsAuth: false, lastError: null };

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.kick());
      document.addEventListener('visibilitychange', () => { if (!document.hidden) this.kick(); });
    }
  }

  subscribe(fn: Listener) { this.listeners.add(fn); fn(this.state); return () => { this.listeners.delete(fn); }; }
  private emit(patch: Partial<OutboxState>) {
    this.state = { ...this.state, ...patch, pending: this.ops.length };
    this.listeners.forEach((l) => l(this.state));
  }
  private save() { localStorage.setItem(KEY, JSON.stringify(this.ops)); }

  push(op: Omit<Op, 'opId'>) {
    this.ops.push({ ...op, opId: crypto.randomUUID() });
    this.save();
    this.emit({});
    this.kick();
  }

  /** Called after the scorer signs in again. */
  resume() { this.emit({ needsAuth: false }); this.backoff = 1000; this.kick(); }
  clearError() { this.emit({ lastError: null }); }

  kick() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    void this.run();
  }

  private async run() {
    if (this.running || this.state.needsAuth) return;
    this.running = true;
    try {
      while (this.ops.length) {
        const op = this.ops[0];
        let res: Response;
        try {
          res = await fetch(op.path, {
            method: op.method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(op.body),
          });
        } catch {
          this.emit({ online: false });
          this.schedule();
          return;
        }
        if (res.status === 401) { this.emit({ needsAuth: true, online: true }); return; }
        if (res.status >= 500 || res.status === 408 || res.status === 429) {
          this.emit({ online: true });
          this.schedule();
          return;
        }
        this.ops.shift();
        this.save();
        this.backoff = 1000;
        if (!res.ok) {
          let msg = `${op.label}: not saved`;
          try { const j = await res.json(); if (j?.message) msg = `${op.label}: ${j.message}`; } catch { /* keep default */ }
          this.emit({ online: true, lastError: msg });
        } else {
          this.emit({ online: true });
        }
      }
    } finally {
      this.running = false;
    }
  }

  private schedule() {
    this.timer = setTimeout(() => this.kick(), this.backoff);
    this.backoff = Math.min(this.backoff * 2, 15000);
  }
}
