/**
 * The facts that appear in the legal pages and the cookie controls.
 *
 * Change a value here and every page that mentions it updates. Keep it in
 * sync with what the app actually does: if you add a provider or a new kind
 * of storage, update this file and the pages under `src/pages`.
 */

/** GoatCounter site code, set at build time as VITE_GOATCOUNTER_CODE. */
const goatcounterCode = (import.meta.env.VITE_GOATCOUNTER_CODE as string | undefined)?.trim() ?? '';

export const LEGAL = {
  /** The person who runs the service (the "data controller"). */
  operator: 'Stephen Garcia',
  /** Where privacy and legal questions go. */
  contactEmail: 'shiro.does.dev@gmail.com',
  siteName: 'Winter Confessions',
  effectiveDate: 'November 15, 2026',
  lastUpdated: 'November 15, 2026',
  /** Youngest age allowed to use the service without a guardian. */
  minimumAge: 13,
  analytics: {
    provider: 'GoatCounter',
    /** Empty when no code was set, which disables analytics entirely. */
    code: goatcounterCode,
    scriptSrc: 'https://gc.zgo.at/count.js',
    endpoint: goatcounterCode ? `https://${goatcounterCode}.goatcounter.com/count` : '',
  },
} as const;
