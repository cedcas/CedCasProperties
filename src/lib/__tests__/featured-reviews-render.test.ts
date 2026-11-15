import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import FeaturedReviews from "@/components/ui/FeaturedReviews";

describe("FeaturedReviews", () => {
  it("renders nothing when given no testimonials — never fabricates a quote", () => {
    const html = renderToStaticMarkup(createElement(FeaturedReviews, { testimonials: [], totalCount: 0 }));
    expect(html).toBe("");
  });

  it("renders only the testimonials it was given, first names and messages included", () => {
    const html = renderToStaticMarkup(
      createElement(FeaturedReviews, {
        testimonials: [
          { id: 1, name: "Maria", location: "Manila", rating: 5, message: "Spotless and quiet." },
        ],
        totalCount: 1,
      })
    );
    expect(html).toContain("Maria");
    expect(html).toContain("Spotless and quiet.");
  });

  it("shows a jump link to #reviews only when more reviews exist than are shown", () => {
    const shown = [{ id: 1, name: "Maria", location: "Manila", rating: 5, message: "Great." }];

    const withMore = renderToStaticMarkup(createElement(FeaturedReviews, { testimonials: shown, totalCount: 5 }));
    expect(withMore).toContain('href="#reviews"');
    expect(withMore).toContain("See all 5 reviews");

    const noMore = renderToStaticMarkup(createElement(FeaturedReviews, { testimonials: shown, totalCount: 1 }));
    expect(noMore).not.toContain('href="#reviews"');
  });
});
