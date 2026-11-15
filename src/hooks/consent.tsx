import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { disableAnalytics, enableAnalytics } from '../lib/analytics';
import {
  DEFAULT_CHOICES,
  onConsentChange,
  readConsent,
  writeConsent,
  type ConsentChoices,
} from '../lib/consent';

interface ConsentValue {
  /** True once the saved choice has been read from storage. */
  ready: boolean;
  /** True once the visitor has made a choice (this visit or a previous one). */
  decided: boolean;
  choices: ConsentChoices;
  /** Convenience: analytics is only on when the visitor allowed it. */
  analyticsEnabled: boolean;
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  save: (choices: ConsentChoices) => void;
}

const ConsentContext = createContext<ConsentValue | null>(null);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [decided, setDecided] = useState(false);
  const [choices, setChoices] = useState<ConsentChoices>(DEFAULT_CHOICES);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const record = readConsent();
    if (record) {
      setChoices({ analytics: record.analytics });
      setDecided(true);
    }
    setReady(true);
    return onConsentChange((next) => {
      if (!next) return;
      setChoices({ analytics: next.analytics });
      setDecided(true);
    });
  }, []);

  // Turn analytics on or off whenever the choice changes.
  useEffect(() => {
    if (!ready) return;
    if (decided && choices.analytics) enableAnalytics();
    else disableAnalytics();
  }, [ready, decided, choices.analytics]);

  const commit = useCallback((next: ConsentChoices) => {
    writeConsent(next);
    setChoices(next);
    setDecided(true);
    setSettingsOpen(false);
  }, []);

  const value = useMemo<ConsentValue>(
    () => ({
      ready,
      decided,
      choices,
      analyticsEnabled: decided && choices.analytics,
      settingsOpen,
      openSettings: () => setSettingsOpen(true),
      closeSettings: () => setSettingsOpen(false),
      acceptAll: () => commit({ analytics: true }),
      rejectNonEssential: () => commit({ analytics: false }),
      save: commit,
    }),
    [ready, decided, choices, settingsOpen, commit],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentValue {
  const value = useContext(ConsentContext);
  if (!value) throw new Error('useConsent must be used inside <ConsentProvider>.');
  return value;
}
