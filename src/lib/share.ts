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
