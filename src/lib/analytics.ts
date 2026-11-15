import { LEGAL } from './legal';

const SCRIPT_ID = 'wc-goatcounter';

/** True when a GoatCounter site code was provided at build time. */
export function analyticsAvailable(): boolean {
  return LEGAL.analytics.code.length > 0 && LEGAL.analytics.endpoint.length > 0;
}

/**
 * Loads the analytics script. It is cookieless and collects no personal data,
 * but we still only call this after the visitor opts in. Safe to call twice.
 */
export function enableAnalytics(): void {
  if (typeof document === 'undefined' || !analyticsAvailable()) return;
  if (document.getElementById(SCRIPT_ID)) return;
  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = LEGAL.analytics.scriptSrc;
  script.dataset.goatcounter = LEGAL.analytics.endpoint;
  document.head.appendChild(script);
}

/** Stops analytics. GoatCounter sets no cookies, so there is nothing to clear. */
export function disableAnalytics(): void {
  document.getElementById(SCRIPT_ID)?.remove();
}
