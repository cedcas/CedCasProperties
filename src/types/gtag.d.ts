export {};

declare global {
  interface Window {
    gtag?: {
      (command: "event" | "config" | "js", target: string | Date, params?: Record<string, unknown>): void;
      (command: "set", params: Record<string, unknown>): void;
    };
    dataLayer?: unknown[];
    /** gtag.js per-property opt-out, e.g. `window['ga-disable-G-2SV2PXYB7T']`. */
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}
