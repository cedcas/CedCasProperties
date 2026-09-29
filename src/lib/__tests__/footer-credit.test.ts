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
 * DEC-023 brand standard: every public page footer carries a subtle
 * "Powered by NetCoreSolutions.com" line where only the domain is a link to
 * https://netcoresolutions.com, and no GeneratePress branding appears anywhere.
 */
async function renderFooter(): Promise<string> {
  // Force the static blog-link fallback; no network in tests.
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  const el = await Footer();
  return renderToStaticMarkup(el);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Footer credit (DEC-023)", () => {
  it("renders 'Powered by NetCoreSolutions.com' with only the domain linked", async () => {
    const html = await renderFooter();
    const links = [...html.matchAll(/<a [^>]*href="https:\/\/netcoresolutions\.com"[^>]*>([^<]*)<\/a>/g)];
    expect(links).toHaveLength(1);
    expect(links[0][1]).toBe("NetCoreSolutions.com");
    expect(html).toMatch(/Powered by <a [^>]*href="https:\/\/netcoresolutions\.com"/);
    expect(NETCORE_CREDIT_URL).toBe("https://netcoresolutions.com");
  });

  it("opens in a new tab with rel=noopener and matches the subtle copyright styling", async () => {
    const html = await renderFooter();
    const tag = html.match(/<a [^>]*href="https:\/\/netcoresolutions\.com"[^>]*>/)![0];
    expect(tag).toContain('target="_blank"');
    expect(tag).toContain('rel="noopener"');
    expect(tag).toContain("hover:text-white/85");
    // Credit sits in the same 12.5px / white-55 block as the copyright line.
    const block = html.match(/<div class="text-\[12\.5px\] text-white\/55">([\s\S]*?)<\/div>/);
    expect(block).not.toBeNull();
    expect(block![1]).toContain("All rights reserved.");
    expect(block![1]).toContain("NetCoreSolutions.com");
  });

  it("writes the brand as one word with no spaces and never mentions GeneratePress", async () => {
    const html = await renderFooter();
    expect(html).not.toMatch(/NetCore Solutions|Net Core/i);
    expect(html).not.toMatch(/generate\s*press/i);
  });
});
