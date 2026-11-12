import { describe, it, expect } from "vitest";
import { isGreetingSuppressedPath } from "@/lib/haven/greeting-gate";

describe("isGreetingSuppressedPath", () => {
  it("suppresses admin and checkout/payment surfaces", () => {
    expect(isGreetingSuppressedPath("/admin/dashboard")).toBe(true);
    expect(isGreetingSuppressedPath("/properties/cozy-1-bedroom/book")).toBe(true);
    expect(isGreetingSuppressedPath("/properties/cozy-1-bedroom/book/")).toBe(true);
    expect(isGreetingSuppressedPath("/pay/abc123")).toBe(true);
    expect(isGreetingSuppressedPath("/pay/booking/abc123")).toBe(true);
    expect(isGreetingSuppressedPath("/some/booking-confirmation")).toBe(true);
  });

  it("allows ordinary guest-facing pages", () => {
    expect(isGreetingSuppressedPath("/")).toBe(false);
    expect(isGreetingSuppressedPath("/properties/cozy-1-bedroom")).toBe(false);
    expect(isGreetingSuppressedPath("/staycation")).toBe(false);
    expect(isGreetingSuppressedPath("/faq")).toBe(false);
  });

  it("doesn't false-positive on a path that merely starts with the same letters", () => {
    expect(isGreetingSuppressedPath("/paydayloans")).toBe(false);
    expect(isGreetingSuppressedPath("/admins-only")).toBe(false);
  });
});
