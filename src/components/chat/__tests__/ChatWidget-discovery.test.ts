// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";

let mockPath = "/";
let mockSearch = "";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPath,
  useSearchParams: () => new URLSearchParams(mockSearch),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    createElement("a", { href, ...rest }, children),
}));

const track = vi.fn();
vi.mock("@/lib/analytics", () => ({ track: (...args: unknown[]) => track(...args) }));

import ChatWidget from "@/components/chat/ChatWidget";
import { chatTree } from "@/lib/chat/chat-tree";

/**
 * Discovery + tracking features from haven-chat-usage-2026-11-09.md: haven_ai_open/
 * _close/_impression/_option_select events (every one carrying chat_surface), the
 * "Ask Haven" launcher label, `?ask=1` auto-open, the arrival greeting pop-up (once per
 * visit, gated by path), and the blog-embed `embedded` mode.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;

beforeEach(() => {
  mockPath = "/";
  mockSearch = "";
  track.mockClear();
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.useRealTimers();
  sessionStorage.clear();
});

function mount(props: Partial<React.ComponentProps<typeof ChatWidget>> = {}) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(createElement(ChatWidget, { tree: chatTree, aiEnabled: true, ...props })));
  return host;
}

function fab(host: HTMLElement) {
  return host.querySelector("#chat-fab") as HTMLButtonElement;
}

describe("ChatWidget — \"Ask Haven\" launcher label", () => {
  it("the FAB's accessible name and visible chip both read \"Ask Haven\" when closed", () => {
    const host = mount();
    const button = fab(host);
    expect(button.getAttribute("aria-label")).toContain("Ask Haven");
    expect(button.textContent).toContain("Ask Haven");
  });
});

describe("ChatWidget — open/close/impression/option_select tracking", () => {
  it("fires haven_ai_impression once per session on first render, tagged chat_surface", () => {
    mount({ chatSurface: "site" });
    expect(track).toHaveBeenCalledWith("haven_ai_impression", { chat_surface: "site" });
    track.mockClear();

    // A second mount in the same session (e.g. a client-side navigation remount) must not
    // fire a second impression.
    act(() => root.unmount());
    document.body.innerHTML = "";
    mount({ chatSurface: "site" });
    expect(track).not.toHaveBeenCalledWith("haven_ai_impression", expect.anything());
  });

  it("fires haven_ai_open with source: launcher on the first FAB click, haven_ai_close on the next", () => {
    const host = mount({ chatSurface: "site" });
    act(() => fab(host).click());
    expect(track).toHaveBeenCalledWith("haven_ai_open", { source: "launcher", chat_surface: "site" });

    act(() => fab(host).click());
    expect(track).toHaveBeenCalledWith("haven_ai_close", { chat_surface: "site" });
  });

  it("fires haven_ai_option_select with the option's node id and no label/PII", () => {
    // aiEnabled: false — the AI-mode "Topics" toggle collapses the chips by default
    // (see ChatWidget.test.ts); irrelevant to this event, so keep the chips directly
    // visible instead of also exercising that toggle here.
    const host = mount({ chatSurface: "site", aiEnabled: false });
    act(() => fab(host).click());
    const propertiesChip = [...host.querySelectorAll('[role="dialog"] button')].find(
      (b) => b.textContent?.trim() === "Our Properties"
    ) as HTMLButtonElement;
    act(() => propertiesChip.click());
    expect(track).toHaveBeenCalledWith("haven_ai_option_select", {
      option_id: "properties",
      chat_surface: "site",
    });
  });
});

describe("ChatWidget — ?ask=1 auto-open", () => {
  it("opens the panel once with source: ask_param and strips the param, keeping other params", () => {
    mockSearch = "?ask=1&utm_source=blog";
    const replaceState = vi.fn();
    vi.stubGlobal("history", { replaceState });
    // jsdom's window.location is read-only in place; stub pathname/search/hash via a getter override.
    Object.defineProperty(window, "location", {
      value: { pathname: "/", search: mockSearch, hash: "" },
      writable: true,
    });

    const host = mount({ chatSurface: "site" });
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    expect(track).toHaveBeenCalledWith("haven_ai_open", { source: "ask_param", chat_surface: "site" });
    expect(replaceState).toHaveBeenCalledWith(null, "", "/?utm_source=blog");
  });
});

describe("ChatWidget — arrival greeting pop-up", () => {
  it("shows after the desktop delay, not before; tapping it opens with source: greeting", () => {
    vi.useFakeTimers();
    const host = mount({ chatSurface: "site" });

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(host.querySelector("#haven-greeting")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1000); // past the 4.5s desktop delay
    });
    const greeting = host.querySelector("#haven-greeting");
    expect(greeting).not.toBeNull();
    expect(greeting?.textContent).toContain("Haven");

    const tapTarget = greeting?.querySelector("button:not([aria-label='Dismiss'])") as HTMLButtonElement;
    act(() => tapTarget.click());
    expect(track).toHaveBeenCalledWith("haven_ai_open", { source: "greeting", chat_surface: "site" });
    expect(host.querySelector("#haven-greeting")).toBeNull();
  });

  it("never shows a second time in the same session (sessionStorage-gated)", () => {
    vi.useFakeTimers();
    const host = mount({ chatSurface: "site" });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(host.querySelector("#haven-greeting")).not.toBeNull();
    act(() => root.unmount());
    document.body.innerHTML = "";

    const host2 = mount({ chatSurface: "site" });
    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(host2.querySelector("#haven-greeting")).toBeNull();
  });

  it("never shows on a checkout/payment path", () => {
    mockPath = "/properties/cozy-1-bedroom/book";
    vi.useFakeTimers();
    const host = mount({ chatSurface: "site" });
    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(host.querySelector("#haven-greeting")).toBeNull();
  });
});

describe("ChatWidget — embedded (blog) mode", () => {
  it("fires haven_ai_open with source: blog_embed once on mount (no separate FAB to click)", () => {
    mount({ chatSurface: "blog", embedded: true });
    expect(track).toHaveBeenCalledWith("haven_ai_open", { source: "blog_embed", chat_surface: "blog" });
    expect(track.mock.calls.filter((c) => c[0] === "haven_ai_open").length).toBe(1);
  });

  it("renders no FAB, opens immediately full-size, and resolves an in-site link to the top-window blog URL", async () => {
    const host = mount({ chatSurface: "blog", embedded: true, aiEnabled: false });
    expect(fab(host)).toBeNull();
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();

    // Select a node whose CTA is an internal link ("properties" -> "Browse All
    // Properties", href "/#properties" in chat-tree.ts), then check the rendered anchor.
    act(() => {
      const propertiesChip = [...host.querySelectorAll('[role="dialog"] button')].find(
        (b) => b.textContent?.trim() === "Our Properties"
      ) as HTMLButtonElement;
      propertiesChip.click();
    });
    const link = [...host.querySelectorAll("a")].find((a) => a.getAttribute("href")?.includes("utm_campaign"));
    expect(link).toBeDefined();
    expect(link?.getAttribute("href")).toContain("https://haveninlipa.com/");
    expect(link?.getAttribute("href")).toContain("utm_campaign=ask-haven");
    expect(link?.getAttribute("target")).toBe("_top");
  });
});
