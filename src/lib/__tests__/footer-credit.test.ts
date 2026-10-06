import { describe, it, expect, vi, afterEach } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    createElement("a", { href, ...rest }, children),
}));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => createElement("img", { src, alt }),
}));

import Footer, { NETCORE_CREDIT_URL } from "@/components/layout/Footer";

/**
 * DEC-025 brand standard, copied from the live tribemedspa.com footer (2026-09-29):
 * `© {year} … <br><a href="https://netcoresolutions.com">Powered by NetCoreSolutions.com</a>`
 * as the left block of the bottom legal row (legal links on the right), 14px in the footer's muted
 * gray (HIL: white/55), no underline until hover/focus-visible, row stacks + centers at <=768px.
 * No GeneratePress branding.
 */
async function renderFooter(): Promise<string> {
  // Force the static blog-link fallback; no network in tests.
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  const el = await Footer();
  return renderToStaticMarkup(el);
}

const CREDIT_A = /<a [^>]*href="https:\/\/netcoresolutions\.com"[^>]*>([^<]*)<\/a>/g;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Footer credit (DEC-025)", () => {
  it("links the whole 'Powered by NetCoreSolutions.com' phrase, once, to netcoresolutions.com", async () => {
    const html = await renderFooter();
    const links = [...html.matchAll(CREDIT_A)];
    expect(links).toHaveLength(1);
    expect(links[0][1]).toBe("Powered by NetCoreSolutions.com");
    expect(NETCORE_CREDIT_URL).toBe("https://netcoresolutions.com");
    // Like the reference: a plain link, no target/rel.
    expect(links[0][0]).not.toMatch(/target=|rel=/);
  });

  it("sits directly under the copyright line, left of the legal links", async () => {
    const html = await renderFooter();
    const row = html.match(/<div class="py-5 [^"]*">([\s\S]*?)<\/div><\/div><\/footer>/);
    expect(row).not.toBeNull();
    const [creditBlock, legal] = row![1].split('<div class="flex gap-5">');
    expect(creditBlock).toMatch(/All rights reserved\.<br\/><a [^>]*href="https:\/\/netcoresolutions\.com"/);
    expect(legal).toContain('href="/privacy"');
    expect(legal).toContain('href="/terms"');
  });

  it("is 14px muted white/55, underlined only on hover/focus, and stacks + centers at <=768px", async () => {
    const html = await renderFooter();
    const rowClass = html.match(/<div class="(py-5 [^"]*)">/)![1].split(" ");
    expect(rowClass).toEqual(
      expect.arrayContaining(["flex", "flex-wrap", "items-center", "justify-between", "text-[14px]", "text-white/55"])
    );
    expect(rowClass).toEqual(expect.arrayContaining(["max-[768px]:flex-col", "max-[768px]:text-center"]));
    const tag = html.match(/<a [^>]*href="https:\/\/netcoresolutions\.com"[^>]*>/)![0];
    const cls = tag.match(/class="([^"]*)"/)![1].split(" ");
    expect(cls).toEqual(
      expect.arrayContaining(["no-underline", "hover:underline", "focus-visible:underline", "hover:text-white/85"])
    );
    // Base size/colour are inherited from the row (same muted gray as the copyright).
    expect(cls.filter((c) => c.startsWith("text-") && !c.includes(":"))).toEqual([]);
  });

  it("writes the brand as one word with no spaces and never mentions GeneratePress", async () => {
    const html = await renderFooter();
    expect(html).not.toMatch(/NetCore Solutions|Net Core/i);
    expect(html).not.toMatch(/generate\s*press/i);
  });
});
