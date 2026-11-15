import { describe, it, expect } from "vitest";
import { selectFeaturedTestimonials, FEATURED_TESTIMONIAL_MAX } from "@/lib/testimonials";

type T = { id: number; rating: number; message: string };

const t = (id: number, rating: number, message: string): T => ({ id, rating, message });

describe("selectFeaturedTestimonials", () => {
  it("returns an empty array for no testimonials — never fabricates a quote", () => {
    expect(selectFeaturedTestimonials([])).toEqual([]);
  });

  it("returns everything when there are fewer than the max", () => {
    const input = [t(1, 5, "Great stay"), t(2, 4, "Good place")];
    expect(selectFeaturedTestimonials(input)).toHaveLength(2);
  });

  it("never returns more than FEATURED_TESTIMONIAL_MAX (3) by default", () => {
    const input = Array.from({ length: 10 }, (_, i) => t(i, 5, `Review number ${i}`));
    expect(selectFeaturedTestimonials(input)).toHaveLength(FEATURED_TESTIMONIAL_MAX);
  });

  it("orders by highest rating first", () => {
    const input = [t(1, 3, "ok"), t(2, 5, "amazing"), t(3, 4, "good")];
    const out = selectFeaturedTestimonials(input);
    expect(out.map((x) => x.id)).toEqual([2, 3, 1]);
  });

  it("breaks a rating tie with the longer (more substantive) message", () => {
    const input = [
      t(1, 5, "Nice."),
      t(2, 5, "This place was absolutely wonderful, spotless, and the host was incredibly responsive."),
      t(3, 5, "Good spot."),
    ];
    const out = selectFeaturedTestimonials(input);
    expect(out[0].id).toBe(2);
  });

  it("respects a custom max", () => {
    const input = [t(1, 5, "a"), t(2, 5, "bb"), t(3, 5, "ccc")];
    expect(selectFeaturedTestimonials(input, 1)).toHaveLength(1);
  });

  it("does not mutate the input array", () => {
    const input = [t(1, 3, "a"), t(2, 5, "b")];
    const copy = [...input];
    selectFeaturedTestimonials(input);
    expect(input).toEqual(copy);
  });

  it("uses only the testimonials it was given — no fixed/fabricated entries", () => {
    const input = [t(42, 5, "only this one")];
    const out = selectFeaturedTestimonials(input);
    expect(out).toEqual([t(42, 5, "only this one")]);
  });
});
