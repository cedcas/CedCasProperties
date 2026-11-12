// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => createElement("img", { src, alt }),
}));

import PropertyGallery from "@/components/ui/PropertyGallery";

/**
 * October SEO review: property-gallery photos without alt text (1BR 62/75, Mickey Sleeps-7
 * 80/93 — mostly the thumbnail strip/lightbox-strip images, which previously hard-coded
 * `alt=""`). Every rendered <img> must now get a real, descriptive alt built from the
 * listing's base name (no Airbnb-style pipe suffix) + city + photo position — never from
 * the raw property.name string.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = "";
});

function mount(images: string[]) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() =>
    root.render(
      createElement(PropertyGallery, {
        images,
        name: "Cozy 1BR Haven | Solar Power•Netflix•Wi-Fi•5 Pax",
        location: "Lipa City, Batangas",
      })
    )
  );
  return host;
}

describe("PropertyGallery alt text", () => {
  it("every <img> gets a non-empty alt, built from the base name (no pipe/bullet/Airbnb)", () => {
    const host = mount(["/a.jpg", "/b.jpg", "/c.jpg", "/d.jpg", "/e.jpg", "/f.jpg", "/g.jpg"]);
    const imgs = [...host.querySelectorAll("img")];
    expect(imgs.length).toBeGreaterThan(0);
    for (const img of imgs) {
      const alt = img.getAttribute("alt") ?? "";
      expect(alt.length).toBeGreaterThan(0);
      expect(alt).not.toContain("|");
      expect(alt).not.toContain("•");
      expect(alt).not.toMatch(/airbnb/i);
      expect(alt).toContain("Cozy 1BR Haven");
      expect(alt).toContain("Lipa City");
    }
  });

  it("an explicit imageAlts entry wins over the generated fallback", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    act(() =>
      root.render(
        createElement(PropertyGallery, {
          images: ["/a.jpg", "/b.jpg"],
          name: "Cozy 1BR Haven | Solar Power",
          location: "Lipa City, Batangas",
          imageAlts: ["Living room with sofa and Netflix-ready TV, Cozy 1BR Haven"],
        })
      )
    );
    const imgs = [...host.querySelectorAll("img")];
    expect(imgs[0].getAttribute("alt")).toBe("Living room with sofa and Netflix-ready TV, Cozy 1BR Haven");
  });
});
