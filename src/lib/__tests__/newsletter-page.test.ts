import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    createElement("a", { href, ...rest }, children),
}));
vi.mock("@/components/layout/Navbar", () => ({ default: () => null }));
vi.mock("@/components/layout/Footer", () => ({ default: () => null }));

import { metadata } from "@/app/newsletter/page";

// Root layout applies `title.template = "%s | Haven in Lipa"`.
const BRAND_SUFFIX = " | Haven in Lipa";
const TITLE_MAX = 60;
const DESCRIPTION_MAX = 160;

describe("/newsletter metadata", () => {
  it("renders within SERP length limits", () => {
    const title = metadata.title as string;
    const description = metadata.description as string;
    expect(`${title}${BRAND_SUFFIX}`.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it("is self-canonical", () => {
    expect(metadata.alternates?.canonical).toBe("/newsletter");
  });

  it("carries matching OpenGraph/Twitter metadata via socialMetadata()", () => {
    expect(metadata.openGraph?.url).toBe("/newsletter");
    expect(metadata.openGraph?.title).toBe(metadata.title);
    expect(metadata.twitter?.title).toBe(metadata.title);
  });
});
