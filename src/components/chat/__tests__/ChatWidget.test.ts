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
 * topic chips buried Haven's AI replies. Static mode (flag off, or a turn that fell back
 * to the tree) must stay byte-for-byte what it was before this change — only an actual
 * AI-mode turn (`{mode: "ai"}`) collapses the chips and adds the persistent Messenger link.
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
  it("collapses the topic chips behind a Topics toggle once an AI reply lands, and exposes a persistent Talk to a Human link", async () => {
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

    // Tapping "Topics" still works as today.
    const topicsToggle = [...host.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Topics")!;
    act(() => topicsToggle.click());
    expect(chipLabels(host)).toContain("Our Properties");
  });

  it("a fallback turn renders exactly like static mode — chips full, no persistent Messenger link", async () => {
    const fetchMock = vi.fn(async () => ({
      json: async () => ({ mode: "static", reason: "rate_limit" }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const host = mount(true);
    openChat(host);
    await sendFreeText(host, "Hello?");

    const labels = chipLabels(host);
    for (const label of ROOT_TOPIC_LABELS) {
      expect(labels).toContain(label);
    }
    expect(labels).not.toContain("Topics");

    const talkLink = [...host.querySelectorAll("a")].find((a) =>
      a.textContent?.includes("Talk to a Human") && a.getAttribute("href") === "https://m.me/haveninlipa"
    );
    expect(talkLink).toBeUndefined();
  });
});
