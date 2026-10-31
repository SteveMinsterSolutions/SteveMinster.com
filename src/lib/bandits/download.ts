// Browser-only download helpers.
import bandits from '../../data/bandits.json';
import type { WaiverPerson } from './waiver';

/** Save a Blob as a file via an object URL and a temporary <a download>. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

/**
 * Build pre-filled waivers in the browser and download them. pdf-lib loads on
 * first use so it isn't in the page bundle. One player → their own filename.
 */
export async function downloadWaivers(people: WaiverPerson[], filename?: string) {
  const { fetchWaiverTemplate, waiverPdf, waiverFilename } = await import('./waiver');
  const bytes = await waiverPdf(await fetchWaiverTemplate(bandits.waiverUrl), people, bandits.waiver);
  saveBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), filename ?? waiverFilename(people[0]));
}
