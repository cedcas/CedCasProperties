export {};

declare global {
  interface Window {
    gtag?: (
      command: "event" | "config" | "js" | "set",
      target: string | Date,
      params?: Record<string, unknown>
    ) => void;
    dataLayer?: unknown[];
  }
}
