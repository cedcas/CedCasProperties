import { describe, it, expect } from "vitest";
import {
  buildEventParams,
  buildGtagConfig,
  hasInternalCookie,
  isAnalyticsHost,
  isInternalMarkerPath,
  isTrackedPath,
  readDebugParam,
  redactPageLocation,
  resolveAnalyticsContext,
  type AnalyticsEnv,
} from "@/lib/analytics-config";

const env = (over: Partial<AnalyticsEnv> = {}): AnalyticsEnv => ({
  hostname: "haveninlipa.com",
  pathname: "/",
  vercelEnv: "production",
  debugOptIn: false,
  internal: false,
  ...over,
});

describe("isAnalyticsHost", () => {
  it("allows only the production apex and www", () => {
    expect(isAnalyticsHost("haveninlipa.com")).toBe(true);
    expect(isAnalyticsHost("www.haveninlipa.com")).toBe(true);
    expect(isAnalyticsHost("HAVENINLIPA.COM")).toBe(true);
  });

  it.each([
    "dev.haveninlipa.com",
    "blog.haveninlipa.com",
    "cedcas-properties-git-dev-cedcas.vercel.app",
    "localhost",
    "127.0.0.1",
    "cpc-m5-mbp-2026",
    "haveninlipa.com.evil.test",
    "evilhaveninlipa.com",
    "",
  ])("rejects %s", (host) => {
    expect(isAnalyticsHost(host)).toBe(false);
  });
});

describe("isTrackedPath", () => {
  it.each(["/", "/properties", "/properties/spacious-2-bedroom", "/properties/x/book", "/pay/abc123", "/faq", "/administrator", "/admins", "/apis", "/about"])(
    "tracks %s",
    (p) => expect(isTrackedPath(p)).toBe(true)
  );

  it.each(["/admin", "/admin/", "/admin/login", "/admin/dashboard", "/admin/bookings/12", "/api/bookings"])(
    "does not track %s",
    (p) => expect(isTrackedPath(p)).toBe(false)
  );
});

describe("isInternalMarkerPath", () => {
  it("marks signed-in admin pages but not the login page or public pages", () => {
    expect(isInternalMarkerPath("/admin/dashboard")).toBe(true);
    expect(isInternalMarkerPath("/admin")).toBe(true);
    expect(isInternalMarkerPath("/admin/login")).toBe(false);
    expect(isInternalMarkerPath("/administrator")).toBe(false);
    expect(isInternalMarkerPath("/")).toBe(false);
  });
});

describe("hasInternalCookie", () => {
  it("finds the marker among other cookies, and only with value 1", () => {
    expect(hasInternalCookie("hil_internal=1")).toBe(true);
    expect(hasInternalCookie("_ga=GA1.1.1; hil_internal=1; x=y")).toBe(true);
    expect(hasInternalCookie("")).toBe(false);
    expect(hasInternalCookie("hil_internal=0")).toBe(false);
    expect(hasInternalCookie("not_hil_internal=1")).toBe(false);
    expect(hasInternalCookie("hil_internal=10")).toBe(false);
  });
});

describe("resolveAnalyticsContext", () => {
  it("enables production host on public paths", () => {
    expect(resolveAnalyticsContext(env())).toEqual({ enabled: true, debug: false, internal: false });
  });

  it("works when NEXT_PUBLIC_VERCEL_ENV is not exposed", () => {
    expect(resolveAnalyticsContext(env({ vercelEnv: undefined })).enabled).toBe(true);
  });

  it("disables non-production hosts", () => {
    expect(resolveAnalyticsContext(env({ hostname: "dev.haveninlipa.com" })).enabled).toBe(false);
    expect(resolveAnalyticsContext(env({ hostname: "localhost" })).enabled).toBe(false);
  });

  it("disables a preview build even on an allowlisted host", () => {
    expect(resolveAnalyticsContext(env({ vercelEnv: "preview" })).enabled).toBe(false);
  });

  it("disables /admin on every host, even with the debug opt-in", () => {
    expect(resolveAnalyticsContext(env({ pathname: "/admin/login" })).enabled).toBe(false);
    expect(resolveAnalyticsContext(env({ pathname: "/admin", debugOptIn: true })).enabled).toBe(false);
  });

  it("debug opt-in enables a non-production host, flagged debug", () => {
    expect(resolveAnalyticsContext(env({ hostname: "localhost", debugOptIn: true }))).toEqual({
      enabled: true,
      debug: true,
      internal: false,
    });
  });

  it("carries the internal marker only when enabled", () => {
    expect(resolveAnalyticsContext(env({ internal: true })).internal).toBe(true);
    expect(resolveAnalyticsContext(env({ internal: true, hostname: "localhost" })).internal).toBe(false);
  });
});

describe("readDebugParam", () => {
  it("parses ?ga_debug", () => {
    expect(readDebugParam("?ga_debug=1")).toBe(true);
    expect(readDebugParam("?x=1&ga_debug=0")).toBe(false);
    expect(readDebugParam("?ga_debug=yes")).toBeNull();
    expect(readDebugParam("")).toBeNull();
  });
});

describe("redactPageLocation / buildGtagConfig", () => {
  it("redacts /pay tokens and leaves other URLs alone", () => {
    expect(redactPageLocation("https://haveninlipa.com/pay/tok_secret?x=1#h")).toBe(
      "https://haveninlipa.com/pay/[token]"
    );
    expect(redactPageLocation("https://haveninlipa.com/properties/a")).toBeNull();
    expect(redactPageLocation("https://haveninlipa.com/payments")).toBeNull();
  });

  it("builds config params from the context", () => {
    const on = { enabled: true, debug: false, internal: false };
    expect(buildGtagConfig(on, "https://haveninlipa.com/")).toEqual({});
    expect(buildGtagConfig({ ...on, internal: true, debug: true }, "https://haveninlipa.com/pay/t")).toEqual({
      traffic_type: "internal",
      debug_mode: true,
      page_location: "https://haveninlipa.com/pay/[token]",
    });
  });

  it("builds event params, context flags winning over caller params", () => {
    expect(
      buildEventParams({ enabled: true, debug: false, internal: true }, { property: "p", traffic_type: "x" })
    ).toEqual({ property: "p", traffic_type: "internal" });
    expect(buildEventParams({ enabled: true, debug: false, internal: false }, { a: 1 })).toEqual({ a: 1 });
  });
});
