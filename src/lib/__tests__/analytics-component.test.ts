// @vitest-environment jsdom
// @vitest-environment-options { "url": "https://haveninlipa.com/" }
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";

let mockPath = "/";
vi.mock("next/navigation", () => ({ usePathname: () => mockPath }));
vi.mock("next/script", () => ({
  default: ({ src }: { src: string }) => createElement("script", { "data-testid": "gtag-js", "data-src": src }),
}));

import Analytics from "@/components/Analytics";
import { __resetAnalyticsForTests } from "@/lib/analytics";
import { GA_DISABLE_KEY, INTERNAL_MARKER_KEY } from "@/lib/analytics-config";

/** The root-layout component on the production host (jsdom URL above). */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;

function render(path: string) {
  mockPath = path;
  window.history.replaceState(null, "", path);
  act(() => root.render(createElement(Analytics)));
}

beforeEach(() => {
  __resetAnalyticsForTests();
  localStorage.clear();
  delete window.gtag;
  delete window.dataLayer;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("<Analytics />", () => {
  it("loads gtag.js and configures GA on a public page", () => {
    render("/properties/a");
    expect(container.querySelector("[data-testid=gtag-js]")).not.toBeNull();
    expect(typeof window.gtag).toBe("function");
    expect(window[GA_DISABLE_KEY]).toBe(false);
  });

  it("renders nothing, configures nothing and marks the device on an admin page", () => {
    render("/admin/dashboard");
    expect(container.querySelector("[data-testid=gtag-js]")).toBeNull();
    expect(window.gtag).toBeUndefined();
    expect(window[GA_DISABLE_KEY]).toBe(true);
    expect(localStorage.getItem(INTERNAL_MARKER_KEY)).toBe("1");
  });

  it("does not mark a device that only saw the login page", () => {
    render("/admin/login");
    expect(localStorage.getItem(INTERNAL_MARKER_KEY)).toBeNull();
  });

  it("flips the kill switch on client-side navigation into and out of /admin", () => {
    render("/");
    expect(window[GA_DISABLE_KEY]).toBe(false);
    render("/admin/bookings");
    expect(window[GA_DISABLE_KEY]).toBe(true);
    expect(container.querySelector("[data-testid=gtag-js]")).toBeNull();
    render("/faq");
    expect(window[GA_DISABLE_KEY]).toBe(false);
  });
});
