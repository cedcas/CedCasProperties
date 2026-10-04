import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  __resetAnalyticsForTests,
  applyUrlOptIns,
  ensureGtag,
  markInternalDevice,
  reportStayMatchArrival,
  syncGaDisable,
  track,
} from "@/lib/analytics";
import { GA_DISABLE_KEY } from "@/lib/analytics-config";

/**
 * Browser-side wiring of the GA4 gate, against a minimal stubbed `window`
 * (node environment — deterministic, no jsdom URL juggling).
 */

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

type FakeWindow = {
  location: { href: string; hostname: string; pathname: string; search: string };
  localStorage: ReturnType<typeof memoryStorage>;
  sessionStorage: ReturnType<typeof memoryStorage>;
  history: { replaceState: ReturnType<typeof vi.fn> };
  gtag?: ReturnType<typeof vi.fn> | ((...args: unknown[]) => void);
  dataLayer?: unknown[];
  [k: string]: unknown;
};

let win: FakeWindow;

function setUrl(href: string) {
  const u = new URL(href);
  win.location = { href: u.href, hostname: u.hostname, pathname: u.pathname, search: u.search };
}

function makeWindow(href: string, gtag?: FakeWindow["gtag"]): FakeWindow {
  win = {
    location: { href: "", hostname: "", pathname: "", search: "" },
    localStorage: memoryStorage(),
    sessionStorage: memoryStorage(),
    history: { replaceState: vi.fn((_s: unknown, _t: string, url: string) => setUrl(new URL(url, win.location.href).href)) },
    gtag,
  };
  setUrl(href);
  vi.stubGlobal("window", win);
  return win;
}

beforeEach(() => {
  __resetAnalyticsForTests();
  vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("track()", () => {
  it("is a no-op without window.gtag (booking flow must not break)", () => {
    makeWindow("https://haveninlipa.com/properties/a/book");
    expect(() => track("booking_confirmed", { value: 1 })).not.toThrow();
  });

  it("sends on the production host with caller params untouched", () => {
    const gtag = vi.fn();
    makeWindow("https://haveninlipa.com/properties/a/book", gtag);
    track("booking_confirmed", { property: "a", value: 5000, currency: "PHP", transaction_id: "HIL-1" });
    expect(gtag).toHaveBeenCalledWith("event", "booking_confirmed", {
      property: "a",
      value: 5000,
      currency: "PHP",
      transaction_id: "HIL-1",
    });
  });

  it.each(["https://dev.haveninlipa.com/", "http://localhost:3000/", "http://cpc-m5-mbp-2026:3000/"])(
    "is a no-op on non-production host %s",
    (href) => {
      const gtag = vi.fn();
      makeWindow(href, gtag);
      track("booking_confirmed", { value: 1 });
      expect(gtag).not.toHaveBeenCalled();
    }
  );

  it("is a no-op on a Vercel preview build of the production host", () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "preview");
    const gtag = vi.fn();
    makeWindow("https://haveninlipa.com/", gtag);
    track("generate_lead");
    expect(gtag).not.toHaveBeenCalled();
  });

  it("is a no-op on /admin even if gtag is loaded", () => {
    const gtag = vi.fn();
    makeWindow("https://haveninlipa.com/admin/dashboard", gtag);
    track("book_click");
    expect(gtag).not.toHaveBeenCalled();
  });

  it("adds traffic_type internal on a marked device", () => {
    const gtag = vi.fn();
    makeWindow("https://haveninlipa.com/", gtag);
    markInternalDevice();
    track("booking_confirmed", { value: 1 });
    expect(gtag).toHaveBeenCalledWith("event", "booking_confirmed", { value: 1, traffic_type: "internal" });
  });

  it("adds traffic_type internal when only the middleware cookie is present", () => {
    const gtag = vi.fn();
    makeWindow("https://haveninlipa.com/", gtag);
    win.document = { cookie: "_ga=GA1.1.1; hil_internal=1" };
    track("booking_confirmed", { value: 1 });
    expect(gtag).toHaveBeenCalledWith("event", "booking_confirmed", { value: 1, traffic_type: "internal" });
  });

  it("?hil_internal=0 expires the cookie too", () => {
    makeWindow("https://haveninlipa.com/?hil_internal=0");
    const doc = { cookie: "hil_internal=1" };
    win.document = doc;
    applyUrlOptIns(win.location.search);
    expect(doc.cookie).toBe("hil_internal=; Max-Age=0; Path=/");
  });

  it("?hil_internal=0 clears the marker", () => {
    const gtag = vi.fn();
    makeWindow("https://haveninlipa.com/?hil_internal=0", gtag);
    markInternalDevice();
    applyUrlOptIns(win.location.search);
    track("x");
    expect(gtag).toHaveBeenCalledWith("event", "x", {});
  });

  it("debug opt-in enables a dev host with debug_mode, and persists for the tab", () => {
    const gtag = vi.fn();
    makeWindow("https://dev.haveninlipa.com/?ga_debug=1", gtag);
    track("a");
    expect(gtag).toHaveBeenLastCalledWith("event", "a", { debug_mode: true });
    applyUrlOptIns(win.location.search);
    setUrl("https://dev.haveninlipa.com/faq");
    track("b");
    expect(gtag).toHaveBeenLastCalledWith("event", "b", { debug_mode: true });
    setUrl("https://dev.haveninlipa.com/?ga_debug=0");
    applyUrlOptIns(win.location.search);
    track("c");
    expect(gtag).toHaveBeenCalledTimes(2);
  });
});

describe("ensureGtag()", () => {
  it("installs the stub and queues js + config (with internal/redaction) once", () => {
    makeWindow("https://haveninlipa.com/pay/tok_secret");
    markInternalDevice();
    ensureGtag();
    ensureGtag();
    const calls = (win.dataLayer ?? []).map((a) => Array.from(a as ArrayLike<unknown>));
    expect(calls).toHaveLength(2);
    expect(calls[0][0]).toBe("js");
    expect(calls[1]).toEqual([
      "config",
      "G-2SV2PXYB7T",
      { traffic_type: "internal", page_location: "https://haveninlipa.com/pay/[token]" },
    ]);
    // Arguments objects, as gtag.js requires — not arrays.
    expect(Array.isArray(win.dataLayer![0])).toBe(false);
  });

  it("does nothing on a non-production host or on /admin", () => {
    makeWindow("https://dev.haveninlipa.com/");
    ensureGtag();
    expect(win.gtag).toBeUndefined();
    makeWindow("https://haveninlipa.com/admin/login");
    ensureGtag();
    expect(win.gtag).toBeUndefined();
  });

  it("sets traffic_type if the marker appears after config", () => {
    const gtag = vi.fn();
    makeWindow("https://haveninlipa.com/", gtag);
    ensureGtag();
    markInternalDevice();
    ensureGtag();
    expect(gtag).toHaveBeenLastCalledWith("set", { traffic_type: "internal" });
  });
});

describe("syncGaDisable()", () => {
  it("toggles the gtag kill switch by path", () => {
    makeWindow("https://haveninlipa.com/");
    syncGaDisable("/admin/dashboard");
    expect(win[GA_DISABLE_KEY]).toBe(true);
    syncGaDisable("/properties/a");
    expect(win[GA_DISABLE_KEY]).toBe(false);
  });
});

describe("reportStayMatchArrival()", () => {
  it("fires stay_match_arrival once and strips the params", () => {
    const gtag = vi.fn();
    makeWindow("https://haveninlipa.com/properties/a/book?checkIn=2026-10-01&hil_sm=book&hil_sm_post=road-trip", gtag);
    reportStayMatchArrival();
    reportStayMatchArrival();
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith("event", "stay_match_arrival", {
      destination: "book",
      post_slug: "road-trip",
      property: "a",
    });
    expect(win.history.replaceState).toHaveBeenCalledWith(null, "", "/properties/a/book?checkIn=2026-10-01");
    expect(win.location.search).toBe("?checkIn=2026-10-01");
  });

  it("strips without sending on a non-production host", () => {
    const gtag = vi.fn();
    makeWindow("https://dev.haveninlipa.com/properties/a?hil_sm=property&hil_sm_post=x", gtag);
    reportStayMatchArrival();
    expect(gtag).not.toHaveBeenCalled();
    expect(win.history.replaceState).toHaveBeenCalledWith(null, "", "/properties/a");
  });

  it("leaves ordinary URLs alone", () => {
    makeWindow("https://haveninlipa.com/properties/a?checkIn=x", vi.fn());
    reportStayMatchArrival();
    expect(win.history.replaceState).not.toHaveBeenCalled();
  });
});
