import { describe, it, expect } from "vitest";
import {
  applySleeps11SegmentFix,
  planSleeps11SegmentFix,
  OLD_TITLE,
  NEW_TITLE,
  NEW_BODY,
  TARGET_PROPERTY,
} from "@/lib/sleeps11-segment-fix";
import { UnexpectedContentError } from "@/lib/property-content-fixes";

// Synthetic fixtures only — never real production content.
const LINK_LABEL = "See the Sleeps-15 full house";
const LINK_URL = "/properties/mickey-in-lipa--full-family-house--sleeps-15";

function segments(oldTitle = OLD_TITLE) {
  return JSON.stringify([
    { title: "Families who want a kids' room", body: "Parents take the master bedroom..." },
    { title: "Reunions and birthday weekends", body: "Sleeping eleven is comfortable here..." },
    {
      title: oldTitle,
      body: "The rate covers 9 guests and this configuration sleeps up to 11 (an extra per-guest fee for the 10th and 11th). For a bigger reunion or barkada, the full-house configuration opens a second bunk room and sleeps up to 15.",
      internalLinkLabel: LINK_LABEL,
      internalLinkUrl: LINK_URL,
    },
  ]);
}

describe("applySleeps11SegmentFix", () => {
  it("retitles and rewords only the matching segment, leaving the link and other segments untouched", () => {
    const { value } = applySleeps11SegmentFix(segments());
    const parsed = JSON.parse(value);
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toEqual(JSON.parse(segments())[0]);
    expect(parsed[1]).toEqual(JSON.parse(segments())[1]);
    expect(parsed[2]).toEqual({
      title: NEW_TITLE,
      body: NEW_BODY,
      internalLinkLabel: LINK_LABEL,
      internalLinkUrl: LINK_URL,
    });
  });

  it("the new body stays free of any peso amount", () => {
    expect(NEW_BODY).not.toMatch(/₱|\bphp\b|\bpesos?\b/i);
  });

  it("the new body keeps the 'covers 9 guests' wording normalizePricingProse relies on", () => {
    expect(NEW_BODY).toMatch(/covers 9 guests/);
  });

  it("refuses when the old title isn't present (e.g. already renamed)", () => {
    expect(() => applySleeps11SegmentFix(segments(NEW_TITLE))).toThrow(UnexpectedContentError);
  });

  it("refuses when the old title appears more than once", () => {
    const dup = JSON.stringify([
      { title: OLD_TITLE, body: "a" },
      { title: OLD_TITLE, body: "b" },
    ]);
    expect(() => applySleeps11SegmentFix(dup)).toThrow(UnexpectedContentError);
  });

  it("refuses on invalid JSON", () => {
    expect(() => applySleeps11SegmentFix("not json")).toThrow(UnexpectedContentError);
  });

  it("refuses when the stored JSON doesn't round-trip (would reformat on write)", () => {
    const pretty = JSON.stringify(JSON.parse(segments()), null, 2);
    expect(() => applySleeps11SegmentFix(pretty)).toThrow(UnexpectedContentError);
  });

  it("refuses when the parsed value isn't an array", () => {
    expect(() => applySleeps11SegmentFix(JSON.stringify({ title: OLD_TITLE }))).toThrow(
      UnexpectedContentError
    );
  });
});

describe("planSleeps11SegmentFix", () => {
  it("builds a plan with a stable hash for the expected property", () => {
    const plan = planSleeps11SegmentFix({
      id: TARGET_PROPERTY.id,
      slug: TARGET_PROPERTY.slug,
      bestForSegments: segments(),
    });
    expect(plan.id).toBe(4);
    expect(plan.slug).toBe(TARGET_PROPERTY.slug);
    expect(JSON.parse(plan.after).some((s: { title: string }) => s.title === NEW_TITLE)).toBe(true);
    expect(plan.planHash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("refuses on an id/slug mismatch", () => {
    expect(() =>
      planSleeps11SegmentFix({ id: 999, slug: "wrong-slug", bestForSegments: segments() })
    ).toThrow(UnexpectedContentError);
    expect(() =>
      planSleeps11SegmentFix({ id: TARGET_PROPERTY.id, slug: "wrong-slug", bestForSegments: segments() })
    ).toThrow(UnexpectedContentError);
  });

  it("refuses when bestForSegments is null", () => {
    expect(() =>
      planSleeps11SegmentFix({ id: TARGET_PROPERTY.id, slug: TARGET_PROPERTY.slug, bestForSegments: null })
    ).toThrow(UnexpectedContentError);
  });
});
