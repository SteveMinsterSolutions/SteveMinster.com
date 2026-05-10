// Astro API route — proxies Make.com Scenario C and normalizes the response shape
// Browser hits this same-origin endpoint; we fetch Make.com server-side (no CORS).

const SCENARIO_C_URL = 'https://hook.us2.make.com/sr6btpvj0ptseg56mha148ofegifjgh7';

export const prerender = false;

export async function GET() {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  };

  try {
    const response = await fetch(SCENARIO_C_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      console.warn('[recent-events] Make.com returned', response.status);
      return new Response(JSON.stringify([]), { status: 200, headers });
    }

    const raw = await response.json();
    const records = Array.isArray(raw) ? raw : [];

    // Make.com returns: [{ key: "...", data: { title, start, importance, description, createdAt }}, ...]
    // React expects:    [{ id: "...", title, start, importance }, ...]
    const flattened = records.map(r => {
      const d = r.data || {};
      // Importance comes back as the string `"high"` (literal quotes included) — strip them.
      const cleanImportance = (d.importance || 'medium').replace(/^"|"$/g, '');
      return {
        id: r.key,
        title: d.title || '',
        start: d.start || '',
        importance: cleanImportance
      };
    }).filter(e => e.id && e.title);

    return new Response(JSON.stringify(flattened), { status: 200, headers });
  } catch (err) {
    // Fail open: empty array, never break the page
    console.error('[recent-events] proxy error:', err.message);
    return new Response(JSON.stringify([]), { status: 200, headers });
  }
}
