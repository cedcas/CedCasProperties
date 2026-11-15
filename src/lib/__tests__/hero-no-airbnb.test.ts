import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Hero from "@/components/sections/Hero";

describe("Hero — DEC-034 guest-facing Airbnb comparison removal", () => {
  it("never names Airbnb, and keeps the platform-fee savings pitch", () => {
    const html = renderToStaticMarkup(createElement(Hero, { propertyCount: 5 }));
    expect(html).not.toMatch(/airbnb/i);
    expect(html).toMatch(/save 15–20% on platform fees/i);
  });
});
