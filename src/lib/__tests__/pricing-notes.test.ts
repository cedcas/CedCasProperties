import { describe, it, expect } from "vitest";
import { safeParsePricingNotes, mergePricingNotesPaymentMethods } from "@/lib/pricing-notes";

describe("pricing-notes", () => {
  describe("safeParsePricingNotes", () => {
    it("parses a well-formed JSON object", () => {
      expect(safeParsePricingNotes('{"rate":"₱2,000/night"}')).toEqual({ rate: "₱2,000/night" });
    });
    it("returns {} for null/undefined/empty", () => {
      expect(safeParsePricingNotes(null)).toEqual({});
      expect(safeParsePricingNotes(undefined)).toEqual({});
      expect(safeParsePricingNotes("")).toEqual({});
    });
    it("returns {} for malformed JSON rather than throwing", () => {
      expect(safeParsePricingNotes("{not json")).toEqual({});
    });
    it("returns {} for valid JSON that isn't a plain object (array/primitive)", () => {
      expect(safeParsePricingNotes("[1,2,3]")).toEqual({});
      expect(safeParsePricingNotes('"just a string"')).toEqual({});
      expect(safeParsePricingNotes("42")).toEqual({});
    });
  });

  describe("mergePricingNotesPaymentMethods", () => {
    it("preserves every sibling key when adding paymentMethods to an existing blob", () => {
      const current = JSON.stringify({
        rate: "₱2,000 per night",
        weeklyDiscount: "Weekly stays: ask when you message",
        monthlyDiscount: "Monthly: dedicated rate",
        deposit: "Full payment required at booking",
        cancellation: "100% refund 7+ days out",
      });
      const result = JSON.parse(mergePricingNotesPaymentMethods(current, "Credit/Debit Card only"));
      expect(result).toEqual({
        rate: "₱2,000 per night",
        weeklyDiscount: "Weekly stays: ask when you message",
        monthlyDiscount: "Monthly: dedicated rate",
        deposit: "Full payment required at booking",
        cancellation: "100% refund 7+ days out",
        paymentMethods: "Credit/Debit Card only",
      });
    });

    it("overwrites an existing paymentMethods value without touching other keys", () => {
      const current = JSON.stringify({
        rate: "₱2,800 per night",
        paymentMethods: "GCash, BPI InstaPay (no fees), Stripe / credit card (6% processing fee applies)",
        cancellation: "50% refund 3-7 days out",
      });
      const result = JSON.parse(
        mergePricingNotesPaymentMethods(current, "GCash, BPI InstaPay (no fees), Credit/Debit Card (6% processing fee applies)")
      );
      expect(result.paymentMethods).toBe(
        "GCash, BPI InstaPay (no fees), Credit/Debit Card (6% processing fee applies)"
      );
      expect(result.rate).toBe("₱2,800 per night");
      expect(result.cancellation).toBe("50% refund 3-7 days out");
    });

    it("creates a fresh object when the current value is null (property never had pricingNotes)", () => {
      const result = JSON.parse(mergePricingNotesPaymentMethods(null, "Credit/Debit Card"));
      expect(result).toEqual({ paymentMethods: "Credit/Debit Card" });
    });

    it("creates a fresh object when the current value is malformed JSON, rather than throwing", () => {
      const result = JSON.parse(mergePricingNotesPaymentMethods("{broken", "Credit/Debit Card"));
      expect(result).toEqual({ paymentMethods: "Credit/Debit Card" });
    });

    it("produces valid JSON that round-trips", () => {
      const raw = mergePricingNotesPaymentMethods('{"rate":"x"}', "GCash only");
      expect(() => JSON.parse(raw)).not.toThrow();
    });
  });
});
