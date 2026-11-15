import { describe, it, expect } from "vitest";
import { toEmbedUrl } from "@/components/ui/PropertyWalkthrough";
import { getWalkthroughVideoUrl, WALKTHROUGH_VIDEOS } from "@/lib/walkthrough-videos";

describe("toEmbedUrl", () => {
  it("converts a youtube watch URL to an embed URL", () => {
    expect(toEmbedUrl("https://www.youtube.com/watch?v=abc123XYZ_-")).toBe(
      "https://www.youtube.com/embed/abc123XYZ_-"
    );
  });

  it("converts a youtu.be short URL to an embed URL", () => {
    expect(toEmbedUrl("https://youtu.be/abc123")).toBe("https://www.youtube.com/embed/abc123");
  });

  it("converts a vimeo URL to a vimeo player URL", () => {
    expect(toEmbedUrl("https://vimeo.com/123456789")).toBe("https://player.vimeo.com/video/123456789");
  });

  it("returns null for a direct video file URL (not an embed, so the <video> fallback is used)", () => {
    expect(toEmbedUrl("https://blob.example.com/unit-walkthrough.mp4")).toBeNull();
  });
});

describe("getWalkthroughVideoUrl", () => {
  it("ships with an empty map — no real URL has been found yet for any slug", () => {
    expect(Object.keys(WALKTHROUGH_VIDEOS)).toHaveLength(0);
  });

  it("returns undefined for every current slug, so the video slot renders nothing", () => {
    for (const slug of [
      "cozy-1-bedroom",
      "spacious-2-bedroom",
      "mickey-in-lipa--family-staycation--sleeps-7",
      "mickey-in-lipa--family-house--sleeps-11",
      "mickey-in-lipa--full-family-house--sleeps-15",
    ]) {
      expect(getWalkthroughVideoUrl(slug)).toBeUndefined();
    }
  });
});
