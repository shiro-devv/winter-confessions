import { useCallback, useEffect, useState } from 'react';
import {
  applyTheme,
  onThemeChange,
  readStoredTheme,
  resolveTheme,
  setTheme as persistTheme,
  systemTheme,
  type Theme,
} from '../lib/theme';

interface ThemeApi {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

/** Reads and controls the light / dark theme. */
export function useTheme(): ThemeApi {
  const [theme, setThemeState] = useState<Theme>(() => resolveTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    // Follow changes from another tab.
    const off = onThemeChange(setThemeState);

    // Follow the OS, but only while the visitor has not picked a theme.
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => {
      if (!readStoredTheme()) setThemeState(systemTheme());
    };
    query.addEventListener('change', onSystemChange);

    return () => {
      off();
      query.removeEventListener('change', onSystemChange);
    };
  }, []);

  const setTheme = useCallback((next: Theme) => {
    persistTheme(next);
    setThemeState(next);
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    persistTheme(next);
    setThemeState(next);
  }, [theme]);

  return { theme, setTheme, toggle };
}
