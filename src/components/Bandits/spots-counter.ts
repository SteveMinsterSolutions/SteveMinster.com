// Fills [data-spots="rostered"] / [data-spots="cap"] from /api/bandits/spots.
// The page renders "—" for rostered until the count arrives, and keeps it on failure.
fetch('/api/bandits/spots')
  .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
  .then((s: { rostered: number; cap: number }) => {
    document.querySelectorAll('[data-spots="rostered"]').forEach((el) => (el.textContent = String(s.rostered)));
    document.querySelectorAll('[data-spots="cap"]').forEach((el) => (el.textContent = String(s.cap)));
  })
  .catch(() => {});
