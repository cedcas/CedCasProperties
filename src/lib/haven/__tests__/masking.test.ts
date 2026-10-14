import { describe, expect, it } from "vitest";
import { maskPii } from "../masking";

describe("maskPii", () => {
  it("masks an email address", () => {
    expect(maskPii("reach me at guest@example.com please")).toBe("reach me at [email] please");
  });

  it("masks a PH mobile number with +63 prefix", () => {
    expect(maskPii("call +63 906 655 4415")).toBe("call [phone]");
  });

  it("masks a PH mobile number in 09xx local format with no separators", () => {
    expect(maskPii("text 09066554415 now")).toBe("text [phone] now");
  });

  it("masks a card-like 16-digit number", () => {
    expect(maskPii("card 4532 1488 0343 6467 exp 12/28")).toBe("card [card] exp 12/28");
  });

  it("masks a long generic digit run that isn't a recognized phone/card shape", () => {
    expect(maskPii("ref 12345678")).toBe("ref [number]");
  });

  it("leaves short numbers (guest counts, prices) untouched", () => {
    expect(maskPii("2 guests, total 4500 for 3 nights")).toBe("2 guests, total 4500 for 3 nights");
  });

  it("leaves ordinary text untouched", () => {
    expect(maskPii("Is there anything available this weekend?")).toBe("Is there anything available this weekend?");
  });
});
