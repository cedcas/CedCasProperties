import { describe, it, expect } from "vitest";
import { chatTree } from "@/lib/chat/chat-tree";

describe("chatTree — DEC-034 guest-facing Airbnb comparison removal", () => {
  it("never names Airbnb in any node message, option label, or link label", () => {
    const text = JSON.stringify(chatTree);
    expect(text).not.toMatch(/airbnb/i);
  });

  it("still makes the direct-booking savings pitch without naming the platform", () => {
    expect(chatTree["pricing-savings"].message).toMatch(/skip the service fees/i);
  });
});
