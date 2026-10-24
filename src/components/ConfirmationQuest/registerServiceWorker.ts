// Register the service worker in builds only. The dev server serves unhashed modules
// that change on every edit, which a cache would only get in the way of.
import { PAGE_PATH } from './supabase';

export function registerServiceWorker() {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;
  // A failed registration only means no offline copy and no install; the game still works.
  navigator.serviceWorker.register(`${PAGE_PATH}sw.js`, { scope: PAGE_PATH }).catch(() => {});
}
