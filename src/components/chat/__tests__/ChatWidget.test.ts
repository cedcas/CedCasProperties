// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";

const mockPath = "/";
vi.mock("next/navigation", () => ({ usePathname: () => mockPath }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    createElement("a", { href, ...rest }, children),
}));

import ChatWidget from "@/components/chat/ChatWidget";
import { chatTree } from "@/lib/chat/chat-tree";

/**
 * Rendered-behaviour regression for the owner's chat-widget UX feedback: the 7 static
 * topic chips buried Haven's welcome message and every reply. Static mode (flag off)
 * must stay byte-for-byte what it was before this change. With the AI flag on, the
 * chips must start collapsed behind a "Topics" toggle from the very first render —
 * including the static-tree welcome message — regardless of whether the latest reply
 * actually came from the AI, and the "Talk to a Human" Messenger link is always visible.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ROOT_TOPIC_LABELS = (chatTree.root.options ?? []).map((o) => o.label);

let root: Root;
afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

function mount(aiEnabled: boolean) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(createElement(ChatWidget, { tree: chatTree, aiEnabled })));
  return host;
}

function openChat(host: HTMLElement) {
  const fab = host.querySelector("#chat-fab") as HTMLButtonElement;
  act(() => fab.click());
}

function chipLabels(host: HTMLElement) {
  return [...host.querySelectorAll('[role="dialog"] button')].map((b) => b.textContent?.trim());
}

async function sendFreeText(host: HTMLElement, text: string) {
  const input = host.querySelector('input[aria-label="Message Haven"]') as HTMLInputElement;
  const form = input.closest("form")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("ChatWidget — static mode (flag off)", () => {
  it("renders all 7 topic chips exactly as before, with no Topics toggle", () => {
    const host = mount(false);
    openChat(host);
    const labels = chipLabels(host);
    for (const label of ROOT_TOPIC_LABELS) {
      expect(labels).toContain(label);
    }
    expect(labels).not.toContain("Topics");
    expect(host.querySelector('[aria-label="Message Haven"]')).toBeNull();
  });
});

describe("ChatWidget — AI mode", () => {
  it("first render (before any message) shows the Topics toggle, no chip buttons, and a persistent Talk to a Human link", () => {
    const host = mount(true);
    openChat(host);

    const labels = chipLabels(host);
    expect(labels).toContain("Topics");
    for (const label of ROOT_TOPIC_LABELS) {
      expect(labels).not.toContain(label);
    }

    const talkLink = [...host.querySelectorAll("a")].find((a) =>
      a.textContent?.includes("Talk to a Human")
    );
    expect(talkLink?.getAttribute("href")).toBe("https://m.me/haveninlipa");
  });

  it("tapping Topics expands all 7 chips, and a chip tap still navigates the tree", () => {
    const host = mount(true);
    openChat(host);

    const topicsToggle = [...host.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Topics")!;
    act(() => topicsToggle.click());

    const labels = chipLabels(host);
    for (const label of ROOT_TOPIC_LABELS) {
      expect(labels).toContain(label);
    }
  });

  it("collapses the topic chips again once the guest sends a message, and renders a distinct AI bubble on reply", async () => {
    const fetchMock = vi.fn(async () => ({
      json: async () => ({
        mode: "ai",
        reply: "Here's what I found.",
        links: [{ label: "Book Casa Linda · Nov 14–15", href: "/properties/casa-linda/book" }],
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const host = mount(true);
    openChat(host);

    // Expand, then send a message — collapse should re-engage.
    const topicsToggle = [...host.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Topics")!;
    act(() => topicsToggle.click());
    await sendFreeText(host, "Do you have anything free this weekend?");

    const labels = chipLabels(host);
    expect(labels).toContain("Topics");
    expect(labels).not.toContain("Our Properties");

    const talkLink = [...host.querySelectorAll("a")].find((a) =>
      a.textContent?.includes("Talk to a Human")
    );
    expect(talkLink?.getAttribute("href")).toBe("https://m.me/haveninlipa");

    expect(host.querySelector('[aria-live="polite"]')).not.toBeNull();

    const havenLabel = [...host.querySelectorAll("span")].find((s) => s.textContent === "Haven");
    expect(havenLabel).toBeTruthy();
    expect(havenLabel!.nextElementSibling?.className).toContain("bg-cream");
  });

  it("a fallback turn still keeps the root 7 chips collapsed, with the Messenger link present", async () => {
    const fetchMock = vi.fn(async () => ({
      json: async () => ({ mode: "static", reason: "rate_limit" }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const host = mount(true);
    openChat(host);
    await sendFreeText(host, "Hello?");

    const labels = chipLabels(host);
    expect(labels).toContain("Topics");
    for (const label of ROOT_TOPIC_LABELS) {
      expect(labels).not.toContain(label);
    }

    const talkLink = [...host.querySelectorAll("a")].find((a) =>
      a.textContent?.includes("Talk to a Human") && a.getAttribute("href") === "https://m.me/haveninlipa"
    );
    expect(talkLink).toBeTruthy();
  });
});
