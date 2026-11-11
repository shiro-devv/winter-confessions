import { AppError } from '../db/errors';

/** The public link where anyone can send a confession to this username. */
export function profileUrl(username: string): string {
  // BASE_URL is '/winter-confessions/' in production and '/' in dev, so the
  // link stays correct when the app is served from a subpath on GitHub Pages.
  return `${window.location.origin}${import.meta.env.BASE_URL}u/${username}`;
}

/** Copies text to the clipboard. Resolves to false if the browser refuses. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/** Encodes a canvas as a PNG blob. */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new AppError('unsupported', 'We could not create the image in this browser.'));
    }, 'image/png');
  });
}

/** Triggers a download of `blob` under `filename`. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke once the browser has had time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** A filesystem-safe version of a username or handle. */
export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/^@+/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'winter-confessions'
  );
}
