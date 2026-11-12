import { describe, it, expect } from "vitest";
import { shouldAutoOpenFromAsk, stripAskParam } from "@/lib/haven/ask-param";

describe("shouldAutoOpenFromAsk", () => {
  it("true only for ask=1", () => {
    expect(shouldAutoOpenFromAsk("?ask=1")).toBe(true);
    expect(shouldAutoOpenFromAsk("?ask=1&utm_source=blog")).toBe(true);
  });

  it("false for anything else", () => {
    expect(shouldAutoOpenFromAsk("")).toBe(false);
    expect(shouldAutoOpenFromAsk("?ask=0")).toBe(false);
    expect(shouldAutoOpenFromAsk("?ask=true")).toBe(false);
    expect(shouldAutoOpenFromAsk("?utm_source=blog")).toBe(false);
  });
});

describe("stripAskParam", () => {
  it("removes ask and keeps other params in order", () => {
    expect(stripAskParam("/properties/cozy-1-bedroom?ask=1&utm_source=blog&utm_medium=haven_chat")).toBe(
      "/properties/cozy-1-bedroom?utm_source=blog&utm_medium=haven_chat"
    );
  });

  it("drops the whole query string when ask was the only param", () => {
    expect(stripAskParam("/?ask=1")).toBe("/");
  });

  it("preserves a hash fragment", () => {
    expect(stripAskParam("/properties/cozy-1-bedroom?ask=1#book")).toBe(
      "/properties/cozy-1-bedroom#book"
    );
  });

  it("is a no-op when ask isn't present", () => {
    expect(stripAskParam("/?utm_source=blog")).toBe("/?utm_source=blog");
  });
});
