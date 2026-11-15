import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PropertyWalkthrough from "@/components/ui/PropertyWalkthrough";

describe("PropertyWalkthrough", () => {
  it("renders nothing when no url is given — the slot omits itself entirely", () => {
    const html = renderToStaticMarkup(createElement(PropertyWalkthrough, { name: "Cozy 1BR Haven" }));
    expect(html).toBe("");
  });

  it("renders an embedded iframe for a youtube url", () => {
    const html = renderToStaticMarkup(
      createElement(PropertyWalkthrough, { url: "https://youtu.be/abc123", name: "Cozy 1BR Haven" })
    );
    expect(html).toContain("<iframe");
    expect(html).toContain("youtube.com/embed/abc123");
    expect(html).toContain("Walkthrough video of Cozy 1BR Haven");
  });

  it("falls back to a native <video> tag for a direct file url", () => {
    const html = renderToStaticMarkup(
      createElement(PropertyWalkthrough, {
        url: "https://blob.example.com/unit-walkthrough.mp4",
        name: "Spacious 2BR Getaway",
      })
    );
    expect(html).toContain("<video");
    expect(html).toContain("unit-walkthrough.mp4");
  });
});
