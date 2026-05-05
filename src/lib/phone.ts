import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export type NormalizedPhone = {
  e164: string;       // "+639171234567"
  national: string;   // "0917 123 4567"
  country: CountryCode; // "PH", "US", etc.
  isPH: boolean;
};

export function normalizePhone(input: string, defaultCountry: CountryCode = "PH"): NormalizedPhone | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
  if (!parsed || !parsed.isValid()) return null;

  return {
    e164: parsed.number,
    national: parsed.formatNational(),
    country: parsed.country ?? defaultCountry,
    isPH: parsed.country === "PH",
  };
}

export function isPHNumber(e164: string): boolean {
  return e164.startsWith("+63");
}

export function toE164OrNull(input: string, defaultCountry: CountryCode = "PH"): string | null {
  const n = normalizePhone(input, defaultCountry);
  return n?.e164 ?? null;
}
