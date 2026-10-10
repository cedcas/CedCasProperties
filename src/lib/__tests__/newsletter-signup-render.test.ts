// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ track }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    createElement("a", { href, ...rest }, children),
}));

import NewsletterSignup from "@/components/sections/NewsletterSignup";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  sessionStorage.clear();
  track.mockClear();
  window.history.pushState({}, "", "/");
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

function render(props: Parameters<typeof NewsletterSignup>[0]) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(createElement(NewsletterSignup, props)));
  return host;
}

function submit(emailValue: string) {
  const email = host.querySelector<HTMLInputElement>('input[name="email"]')!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(email, emailValue);
    email.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const form = host.querySelector("form")!;
  return act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("NewsletterSignup — strip variant", () => {
  it("renders only the email field, a honeypot, and an inline submit button", () => {
    render({ variant: "strip", source: "site:homepage" });
    expect(host.querySelector('input[name="email"]')).not.toBeNull();
    expect(host.querySelector('input[name="firstName"]')).toBeNull();
    expect(host.querySelector('input[name="phone"]')).toBeNull();
    const honeypot = host.querySelector<HTMLInputElement>('input[name="company"]')!;
    expect(honeypot.tabIndex).toBe(-1);
    expect(honeypot.autocomplete).toBe("off");
  });

  it("submits, fires generate_lead, and shows the success message with no layout-shifting removal of the form", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, alreadySubscribed: false, message: "Thanks for subscribing!" }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    render({ variant: "strip", source: "site:footer" });
    await submit("guest@example.com");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/newsletter");
    const body = JSON.parse(init.body as string);
    expect(body.email).toBe("guest@example.com");
    expect(body.source).toBe("site:footer");
    expect(body.company).toBe("");

    expect(track).toHaveBeenCalledWith("generate_lead", { method: "newsletter", lead_source: "site:footer" });
    expect(host.querySelector('[role="status"]')!.textContent).toContain("Thanks for subscribing!");
    // Form stays mounted (status slot has a reserved min-height) rather than being swapped out.
    expect(host.querySelector('input[name="email"]')).not.toBeNull();
  });

  it("shows a friendly error and does not fire GA4 on failure", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      json: async () => ({ ok: false, error: "Too many requests. Please try again later." }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    render({ variant: "strip", source: "site:homepage" });
    await submit("guest@example.com");

    expect(host.querySelector('[role="status"]')!.textContent).toContain("Too many requests");
    expect(track).not.toHaveBeenCalled();
  });
});

describe("NewsletterSignup — page variant", () => {
  it("renders first name and phone as optional fields alongside email", () => {
    render({ variant: "page", source: "site:newsletter-page" });
    expect(host.querySelector('input[name="firstName"]')).not.toBeNull();
    expect(host.querySelector('input[name="phone"]')).not.toBeNull();
    expect(host.querySelector('input[name="firstName"]')!.hasAttribute("required")).toBe(false);
    expect(host.querySelector('input[name="phone"]')!.hasAttribute("required")).toBe(false);
    expect(host.querySelector('input[name="email"]')!.hasAttribute("required")).toBe(true);
  });
});

describe("NewsletterSignup — UTM passthrough", () => {
  it("captures UTM params from the URL on mount, persists them, and sends them on submit", async () => {
    window.history.pushState({}, "", "/newsletter?utm_source=sms&utm_medium=text&ignored=1");
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, alreadySubscribed: false }) }));
    vi.stubGlobal("fetch", fetchMock);

    render({ variant: "page", source: "site:newsletter-page" });
    expect(JSON.parse(sessionStorage.getItem("hil_newsletter_utm")!)).toEqual({ utm_source: "sms", utm_medium: "text" });

    await submit("guest@example.com");
    const [, pageInit] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(pageInit.body as string);
    expect(body.utm).toEqual({ utm_source: "sms", utm_medium: "text" });
    expect(body.page).toBe("/newsletter");
  });

  it("falls back to a previously persisted UTM when the current URL carries none", async () => {
    sessionStorage.setItem("hil_newsletter_utm", JSON.stringify({ utm_source: "sms", utm_campaign: "holiday2026" }));
    window.history.pushState({}, "", "/");
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, alreadySubscribed: false }) }));
    vi.stubGlobal("fetch", fetchMock);

    render({ variant: "strip", source: "site:footer" });
    await submit("guest@example.com");
    const [, fallbackInit] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(fallbackInit.body as string);
    expect(body.utm).toEqual({ utm_source: "sms", utm_campaign: "holiday2026" });
  });
});
