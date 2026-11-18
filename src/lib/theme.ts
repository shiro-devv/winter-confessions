/**
 * Light / dark theme handling.
 *
 * The site ships two palettes: the warm sand "light" theme and the winter
 * night "dark" theme. The choice is remembered in localStorage (`wc:theme`)
 * and defaults to whatever the operating system prefers.
 */

export type Theme = 'light' | 'dark';

export const THEME_KEY = 'wc:theme';
const THEME_EVENT = 'wc:theme-change';

/** The browser-chrome colour that matches each theme. */
const THEME_COLORS: Record<Theme, string> = {
  light: '#d8cbb3',
  dark: '#0a1122',
};

/** What the operating system currently asks for. */
export function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** The theme the visitor picked, or null if they never picked one. */
export function readStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

/** The theme to show: the visitor's choice, or the system preference. */
export function resolveTheme(): Theme {
  return readStoredTheme() ?? systemTheme();
}

/** Paints the theme onto <html> and keeps the browser chrome in sync. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  // Keep the metas in step with the choice made after load (the inline script in
  // index.html sets them for the first paint).
  const colorScheme = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (colorScheme) colorScheme.content = theme === 'dark' ? 'dark' : 'only light';
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = THEME_COLORS[theme];
}

/** Remembers a theme the visitor chose and applies it everywhere. */
export function setTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* Storage blocked (private mode). The theme still applies for this visit. */
  }
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: theme }));
}

/** Calls `listener` when the theme changes here or in another tab. */
export function onThemeChange(listener: (theme: Theme) => void): () => void {
  const onLocal = (event: Event) => {
    listener(event instanceof CustomEvent ? (event.detail as Theme) : resolveTheme());
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === THEME_KEY) listener(resolveTheme());
  };
  window.addEventListener(THEME_EVENT, onLocal);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(THEME_EVENT, onLocal);
    window.removeEventListener('storage', onStorage);
  };
}
