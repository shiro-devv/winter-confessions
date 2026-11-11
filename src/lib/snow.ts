export const SNOW_BURST_EVENT = 'wc:snow-burst';

/** Makes a quick extra flurry of snow fall, e.g. after sending a confession. */
export function triggerSnowBurst(): void {
  window.dispatchEvent(new Event(SNOW_BURST_EVENT));
}
