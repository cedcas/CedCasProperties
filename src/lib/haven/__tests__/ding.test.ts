import { describe, it, expect } from "vitest";
import { shouldPlayHavenDing } from "@/lib/haven/ding";

describe("shouldPlayHavenDing", () => {
  it("only true after interaction and without prefers-reduced-motion", () => {
    expect(shouldPlayHavenDing({ hasUserInteracted: true, prefersReducedMotion: false })).toBe(true);
  });

  it("never before the guest has interacted (no autoplay on arrival)", () => {
    expect(shouldPlayHavenDing({ hasUserInteracted: false, prefersReducedMotion: false })).toBe(false);
  });

  it("never under prefers-reduced-motion, even after interaction", () => {
    expect(shouldPlayHavenDing({ hasUserInteracted: true, prefersReducedMotion: true })).toBe(false);
  });

  it("never when both gates fail", () => {
    expect(shouldPlayHavenDing({ hasUserInteracted: false, prefersReducedMotion: true })).toBe(false);
  });
});
