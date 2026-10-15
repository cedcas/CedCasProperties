import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getPublicListings, getPublicListingGroups } from "@/lib/listings";
import { getPropertyConflicts, getInventoryScopeConflicts, formatConflictRange } from "@/lib/availability";
import { computeBookingQuote } from "@/lib/booking-quote";
import { sanitizeChargeProse } from "@/lib/occupancy";
import { faqs as staticFaqs } from "@/lib/faqs";
import { toUtcMidnight, addUtcDays, formatStayDate } from "@/lib/dates";
import { HOURLY_FEE_RATE } from "@/lib/hourly-fee";
import { resolveDates } from "./dates";
import type { ToolDefinition } from "./provider";

/**
 * Read-only tools Haven's AI mode may call. Every tool is zod-validated at the
 * boundary and calls EXISTING services only — nothing here computes a price or an
 * availability decision; that logic stays owned by booking-quote.ts / availability.ts
 * so the AI path can never drift from the booking path (DEC-020, DEC-029).
 */

function safeJsonParse<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

function bookingLink(slug: string, checkIn: string, checkOut: string, guests: number): string {
  return `/properties/${slug}/book?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`;
}

/**
 * Per-night (date, weekday, rate) rows from a quote's own `dailyRates` — so Haven can
 * optionally show a stay's nightly breakdown (e.g. a weekday vs. weekend rate) without
 * ever having to add the nights up itself (DEC-029 — see system-prompt.ts's ban on the
 * model multiplying/summing rates). Filters out any entry missing a `date` defensively;
 * every real `getDailyRates` row has one, this only guards a malformed input.
 */
function dailyRateBreakdown(dailyRates: { date: string; rate: number }[]): { date: string; weekday: string; rate: number }[] {
  return dailyRates
    .filter((d) => typeof d.date === "string")
    .map((d) => ({ date: d.date, weekday: formatStayDate(d.date, { weekday: "long" }), rate: d.rate }));
}

export interface HavenToolSpec<Args = unknown> {
  definition: ToolDefinition;
  schema: z.ZodType<Args>;
  handler: (args: Args) => Promise<unknown>;
}

// ── resolve_dates ────────────────────────────────────────────────────────────

const resolveDatesSchema = z.object({ expression: z.string().min(1).max(200) });

const resolveDatesTool: HavenToolSpec<z.infer<typeof resolveDatesSchema>> = {
  definition: {
    name: "resolve_dates",
    description:
      "Resolve a natural-language date expression (e.g. 'this weekend', 'next Friday to " +
      "Sunday', '2nd Saturday of November', 'Dec 24-26') into exact ISO checkIn/checkOut " +
      "dates in Asia/Manila. ALWAYS use this instead of computing a date yourself.",
    inputSchema: {
      type: "object",
      properties: { expression: { type: "string", description: "The guest's date phrase, verbatim." } },
      required: ["expression"],
      additionalProperties: false,
    },
  },
  schema: resolveDatesSchema,
  handler: async ({ expression }) => {
    const resolved = resolveDates(expression);
    return resolved ?? { error: "Could not understand that date expression — ask the guest to clarify or give exact dates." };
  },
};

// ── list_properties ──────────────────────────────────────────────────────────

const listPropertiesSchema = z.object({});

const listPropertiesTool: HavenToolSpec<z.infer<typeof listPropertiesSchema>> = {
  definition: {
    name: "list_properties",
    description: "List every public, bookable property (slug, name, type, location, price, capacity).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  schema: listPropertiesSchema,
  handler: async () => {
    const properties = await getPublicListings();
    return properties.map((p) => ({
      slug: p.slug,
      name: p.name,
      type: p.type,
      location: p.location,
      pricePerNight: Number(p.pricePerNight),
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      maxGuests: p.maxGuests,
      // airbnbIcsUrl intentionally never exposed.
    }));
  },
};

// ── get_property_details ─────────────────────────────────────────────────────

const getPropertyDetailsSchema = z.object({ slug: z.string().min(1).max(200) });

const getPropertyDetailsTool: HavenToolSpec<z.infer<typeof getPropertyDetailsSchema>> = {
  definition: {
    name: "get_property_details",
    description:
      "Full details for one property by slug: description, amenities, house rules, " +
      "policies, pricing notes, FAQs, and nearby places.",
    inputSchema: {
      type: "object",
      properties: { slug: { type: "string" } },
      required: ["slug"],
      additionalProperties: false,
    },
  },
  schema: getPropertyDetailsSchema,
  handler: async ({ slug }) => {
    const p = await prisma.property.findFirst({
      where: { slug, isActive: true, pricePerNight: { gt: 0 } },
      select: {
        slug: true,
        name: true,
        description: true,
        amenities: true,
        amenityDetails: true,
        propertyRules: true,
        housePolicies: true,
        pricingNotes: true,
        propertyFaqs: true,
        neighborhoodPlaces: true,
        maxGuests: true,
        includedGuests: true,
        extraGuestFeePerNight: true,
      },
    });
    if (!p) return { error: "Property not found." };

    const occupancy = {
      maxGuests: p.maxGuests,
      includedGuests: p.includedGuests,
      extraGuestFeePerNight: Number(p.extraGuestFeePerNight),
    };

    return {
      slug: p.slug,
      name: p.name,
      description: p.description,
      amenities: safeJsonParse<string[]>(p.amenities, []),
      amenityDetails: safeJsonParse(p.amenityDetails, []),
      propertyRules: sanitizeChargeProse(p.propertyRules, occupancy),
      housePolicies: safeJsonParse(p.housePolicies, null),
      pricingNotes: safeJsonParse(p.pricingNotes, null),
      propertyFaqs: safeJsonParse(p.propertyFaqs, []),
      neighborhoodPlaces: safeJsonParse(p.neighborhoodPlaces, []),
      // Structured, numeric fee fields — so a guest question about a specific fee (early
      // check-in/late checkout, extra guest) can be answered with a real traceable number
      // instead of the model guessing one. Mirrors the same published figures used in
      // src/lib/hourly-fee.ts and the occupancy fee note (never computed here).
      fees: {
        extraGuestFeePerNight: occupancy.extraGuestFeePerNight,
        earlyCheckInPerHour: HOURLY_FEE_RATE,
        lateCheckoutPerHour: HOURLY_FEE_RATE,
      },
    };
  },
};

// ── check_availability ────────────────────────────────────────────────────────

const checkAvailabilitySchema = z.object({
  slug: z.string().min(1).max(200),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const checkAvailabilityTool: HavenToolSpec<z.infer<typeof checkAvailabilitySchema>> = {
  definition: {
    name: "check_availability",
    description: "Check whether a property is free for an exact checkIn/checkOut (YYYY-MM-DD) date range.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string" },
        checkIn: { type: "string", description: "YYYY-MM-DD" },
        checkOut: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["slug", "checkIn", "checkOut"],
      additionalProperties: false,
    },
  },
  schema: checkAvailabilitySchema,
  handler: async ({ slug, checkIn, checkOut }) => {
    const property = await prisma.property.findFirst({
      where: { slug, isActive: true, pricePerNight: { gt: 0 } },
      select: { id: true },
    });
    if (!property) return { error: "Property not found." };

    const start = toUtcMidnight(checkIn);
    const end = toUtcMidnight(checkOut);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return { error: "Invalid date range." };
    }

    const conflicts = await getPropertyConflicts({ propertyId: property.id, start, end });
    return {
      available: conflicts.length === 0,
      conflicts: conflicts.map(formatConflictRange),
    };
  },
};

// ── get_quote ─────────────────────────────────────────────────────────────────

const getQuoteSchema = z.object({
  slug: z.string().min(1).max(200),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(50),
});

const getQuoteTool: HavenToolSpec<z.infer<typeof getQuoteSchema>> = {
  definition: {
    name: "get_quote",
    description: "Server-computed price quote for a stay. Numbers from this tool are the only numbers you may state.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string" },
        checkIn: { type: "string", description: "YYYY-MM-DD" },
        checkOut: { type: "string", description: "YYYY-MM-DD" },
        guests: { type: "integer" },
      },
      required: ["slug", "checkIn", "checkOut", "guests"],
      additionalProperties: false,
    },
  },
  schema: getQuoteSchema,
  handler: async ({ slug, checkIn, checkOut, guests }) => {
    const property = await prisma.property.findFirst({
      where: { slug, isActive: true, pricePerNight: { gt: 0 } },
      select: { id: true, name: true },
    });
    if (!property) return { error: "Property not found." };

    const result = await computeBookingQuote({ propertyId: property.id, checkIn, checkOut, guests });
    if (!result.ok) return { error: result.error };

    const { quote } = result;
    return {
      name: property.name,
      nightlyTotal: quote.nightlyTotal,
      extraGuestFee: quote.extraGuestFee,
      discountAmount: quote.discountAmount,
      total: quote.total,
      nights: quote.dailyRates.length,
      // Per-night (date, weekday, rate) rows — state the `total` above for the stay; never
      // multiply/sum these rows yourself (see system-prompt.ts).
      perNight: dailyRateBreakdown(quote.dailyRates),
      bookingLink: bookingLink(slug, checkIn, checkOut, guests),
    };
  },
};

// ── find_stay ─────────────────────────────────────────────────────────────────

export interface StayCandidateProperty {
  id: number;
  slug: string;
  name: string;
  maxGuests: number;
  /** Shared-inventory key — two properties with the same key can never both be booked. */
  groupKey: string;
}

export interface StayCombo {
  properties: StayCandidateProperty[];
  guestSplit: number[];
}

/** Distribute `guests` across a combo, filling smaller-capacity properties first. Pure. */
export function splitGuestsAcrossCombo(
  combo: StayCandidateProperty[],
  guests: number
): number[] | null {
  const sorted = [...combo].sort((a, b) => a.maxGuests - b.maxGuests);
  const alloc = new Map<StayCandidateProperty, number>();
  let remaining = guests;
  for (const p of sorted) {
    const take = Math.min(p.maxGuests, remaining);
    alloc.set(p, take);
    remaining -= take;
  }
  if (remaining > 0) return null;
  return combo.map((p) => alloc.get(p) ?? 0);
}

/**
 * Pure combination search — no DB. `available` is already filtered to properties free
 * for the requested dates. Single properties that fit alone always win over combos.
 * Combos never pair two properties sharing a `groupKey` (same physical house — DEC-001).
 */
export function findStayCombinations(
  available: StayCandidateProperty[],
  guests: number,
  opts: { maxProperties?: number; maxOptions?: number } = {}
): StayCombo[] {
  const maxProperties = opts.maxProperties ?? 3;
  const maxOptions = opts.maxOptions ?? 5;

  const singles = available
    .filter((p) => p.maxGuests >= guests)
    .sort((a, b) => a.maxGuests - b.maxGuests)
    .map((p) => ({ properties: [p], guestSplit: [guests] }));
  if (singles.length > 0) return singles.slice(0, maxOptions);

  function combinationsOfSize(size: number): StayCandidateProperty[][] {
    const results: StayCandidateProperty[][] = [];
    const n = available.length;
    function pick(start: number, chosen: StayCandidateProperty[]) {
      if (chosen.length === size) {
        results.push([...chosen]);
        return;
      }
      for (let i = start; i < n; i++) {
        const candidate = available[i];
        if (chosen.some((c) => c.groupKey === candidate.groupKey)) continue;
        chosen.push(candidate);
        pick(i + 1, chosen);
        chosen.pop();
      }
    }
    pick(0, []);
    return results;
  }

  const combos: StayCombo[] = [];
  for (let size = 2; size <= maxProperties && combos.length < maxOptions; size++) {
    const sized = combinationsOfSize(size)
      .filter((combo) => combo.reduce((s, p) => s + p.maxGuests, 0) >= guests)
      .sort(
        (a, b) =>
          a.reduce((s, p) => s + p.maxGuests, 0) - b.reduce((s, p) => s + p.maxGuests, 0)
      );
    for (const combo of sized) {
      const guestSplit = splitGuestsAcrossCombo(combo, guests);
      if (guestSplit) combos.push({ properties: combo, guestSplit });
      if (combos.length >= maxOptions) break;
    }
  }
  return combos.slice(0, maxOptions);
}

const findStaySchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(50),
});

const findStayTool: HavenToolSpec<z.infer<typeof findStaySchema>> = {
  definition: {
    name: "find_stay",
    description:
      "For a group that might not fit in one property: finds single properties that fit, " +
      "or combinations of properties (never two configurations of the same house) whose " +
      "combined capacity covers the group, for the given dates.",
    inputSchema: {
      type: "object",
      properties: {
        checkIn: { type: "string", description: "YYYY-MM-DD" },
        checkOut: { type: "string", description: "YYYY-MM-DD" },
        guests: { type: "integer" },
      },
      required: ["checkIn", "checkOut", "guests"],
      additionalProperties: false,
    },
  },
  schema: findStaySchema,
  handler: async ({ checkIn, checkOut, guests }) => {
    const start = toUtcMidnight(checkIn);
    const end = toUtcMidnight(checkOut);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return { error: "Invalid date range." };
    }

    const [properties, memberships] = await Promise.all([getPublicListings(), getPublicListingGroups()]);
    const groupOf = new Map(memberships.map((m) => [m.propertyId, m.inventoryGroupId]));

    const availability = await Promise.all(
      properties.map(async (p) => ({
        property: p,
        conflicts: await getPropertyConflicts({ propertyId: p.id, start, end }),
      }))
    );

    const available: StayCandidateProperty[] = availability
      .filter(({ conflicts }) => conflicts.length === 0)
      .map(({ property: p }) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        maxGuests: p.maxGuests,
        groupKey: groupOf.has(p.id) ? `group-${groupOf.get(p.id)}` : `listing-${p.slug}`,
      }));

    const combos = findStayCombinations(available, guests);
    if (combos.length === 0) {
      return { options: [], message: "Nothing fits that group size on those dates across our properties." };
    }

    const options = await Promise.all(
      combos.map(async (combo) => {
        const perProperty = await Promise.all(
          combo.properties.map(async (p, i) => {
            const quoteResult = await computeBookingQuote({
              propertyId: p.id,
              checkIn,
              checkOut,
              guests: combo.guestSplit[i],
            });
            return {
              slug: p.slug,
              name: p.name,
              guests: combo.guestSplit[i],
              quote: quoteResult.ok
                ? {
                    total: quoteResult.quote.total,
                    nightlyTotal: quoteResult.quote.nightlyTotal,
                    perNight: dailyRateBreakdown(quoteResult.quote.dailyRates),
                  }
                : null,
              bookingLink: bookingLink(p.slug, checkIn, checkOut, combo.guestSplit[i]),
            };
          })
        );
        return {
          properties: perProperty,
          combinedTotal: perProperty.reduce((sum, p) => sum + (p.quote?.total ?? 0), 0),
        };
      })
    );

    return { options };
  },
};

// ── check_early_late ──────────────────────────────────────────────────────────

export type EarlyLateStatus = "likely_possible" | "not_possible" | "unknown";

export interface EarlyLateResult {
  status: EarlyLateStatus;
  reason: string;
  standardTime: string | null;
  fee: string;
}

const EARLY_LATE_FEE_LABEL = `₱${HOURLY_FEE_RATE}/hour`;

type HousePoliciesShape = { checkInTime?: string; checkOutTime?: string };

const checkEarlyLateSchema = z.object({
  slug: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(["early_checkin", "late_checkout"]),
});

/**
 * Date-aware early check-in / late checkout check. Early check-in on `date` is blocked
 * if some stay/block occupies the night before it (a conflict ending exactly on `date`);
 * late checkout on `date` is blocked if some stay/block occupies the night of `date`
 * itself (a conflict starting exactly on `date`). Uses `getInventoryScopeConflicts` —
 * the same commit-time check the booking flow uses — so a shared-inventory sibling
 * booking or an imported Airbnb iCal event blocks the fee the same way a direct booking
 * does. Never promises a fee is approved: at most "likely possible, subject to
 * confirmation" (DEC-029 — no tool computes an availability *decision* on its own, this
 * only ever relays what `getInventoryScopeConflicts` already found).
 */
const checkEarlyLateTool: HavenToolSpec<z.infer<typeof checkEarlyLateSchema>> = {
  definition: {
    name: "check_early_late",
    description:
      "Check whether an early check-in or late checkout is likely possible for a specific " +
      "property and date, given other guests' stays/blocks on neighboring nights. Always " +
      "subject to confirmation — never state a fee is approved from this tool alone.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD — the check-in (early) or check-out (late) date in question." },
        kind: { type: "string", enum: ["early_checkin", "late_checkout"] },
      },
      required: ["slug", "date", "kind"],
      additionalProperties: false,
    },
  },
  schema: checkEarlyLateSchema,
  handler: async ({ slug, date, kind }) => {
    const unknown = (reason: string, standardTime: string | null = null): EarlyLateResult => ({
      status: "unknown",
      reason,
      standardTime,
      fee: EARLY_LATE_FEE_LABEL,
    });

    const property = await prisma.property.findFirst({
      where: { slug, isActive: true, pricePerNight: { gt: 0 } },
      select: { id: true, housePolicies: true },
    });
    if (!property) return unknown("Property not found.");

    const target = toUtcMidnight(date);
    if (isNaN(target.getTime())) return unknown("Invalid date.");

    const policies = safeJsonParse<HousePoliciesShape>(property.housePolicies, {});
    const standardTime = (kind === "early_checkin" ? policies.checkInTime : policies.checkOutTime) ?? null;

    let conflicts;
    try {
      conflicts = await getInventoryScopeConflicts({
        propertyId: property.id,
        start: addUtcDays(target, -1),
        end: addUtcDays(target, 1),
      });
    } catch {
      return unknown("Could not check availability for that date right now.", standardTime);
    }

    const targetTime = target.getTime();
    const blocked =
      kind === "early_checkin"
        ? conflicts.some((c) => c.end.getTime() === targetTime)
        : conflicts.some((c) => c.start.getTime() === targetTime);

    if (blocked) {
      return {
        status: "not_possible",
        reason:
          kind === "early_checkin"
            ? "Another guest is staying the night before and the house won't be ready early that day."
            : "Another guest is checking in that same day, so a late checkout isn't possible.",
        standardTime,
        fee: EARLY_LATE_FEE_LABEL,
      };
    }

    return {
      status: "likely_possible",
      reason:
        kind === "early_checkin"
          ? "No other guest is staying the night before, but this is always subject to confirmation with the team."
          : "No other guest is checking in that day, but this is always subject to confirmation with the team.",
      standardTime,
      fee: EARLY_LATE_FEE_LABEL,
    };
  },
};

// ── get_faq ───────────────────────────────────────────────────────────────────

const getFaqSchema = z.object({ query: z.string().min(1).max(300) });

const getFaqTool: HavenToolSpec<z.infer<typeof getFaqSchema>> = {
  definition: {
    name: "get_faq",
    description:
      "Search the site's FAQ (payments, cancellation, check-in, amenities, contact, etc.) for an answer.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
      additionalProperties: false,
    },
  },
  schema: getFaqSchema,
  handler: async ({ query }) => {
    const words = query.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    if (words.length === 0) return { results: [] };

    const scored = staticFaqs
      .map((faq) => {
        const haystack = `${faq.q} ${faq.a}`.toLowerCase();
        const score = words.reduce((s, w) => s + (haystack.includes(w) ? 1 : 0), 0);
        return { faq, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return { results: scored.map(({ faq }) => ({ question: faq.q, answer: faq.a })) };
  },
};

// ── find_amenity ──────────────────────────────────────────────────────────────

const findAmenitySchema = z.object({ term: z.string().min(1).max(100) });

/**
 * Searches EVERY public property's amenities + amenityDetails for one item (karaoke,
 * videoke, pool, grill, etc.) — so the model never has to ask "which house?" before it
 * knows whether we have something at all, and never falls back to inferring equipment
 * from marketing/description copy (DEC-029 addendum — see owner-facts.ts).
 */
const findAmenityTool: HavenToolSpec<z.infer<typeof findAmenitySchema>> = {
  definition: {
    name: "find_amenity",
    description:
      "Search ALL public properties' amenities/amenityDetails for a specific item (e.g. " +
      "karaoke, videoke, pool, grill). ALWAYS use this for an amenity/equipment question " +
      "instead of asking which house has it, and never infer equipment from marketing copy.",
    inputSchema: {
      type: "object",
      properties: { term: { type: "string", description: "The amenity/equipment the guest asked about, e.g. 'karaoke'." } },
      required: ["term"],
      additionalProperties: false,
    },
  },
  schema: findAmenitySchema,
  handler: async ({ term }) => {
    const properties = await prisma.property.findMany({
      where: { isActive: true, pricePerNight: { gt: 0 } },
      select: { slug: true, name: true, amenities: true, amenityDetails: true },
    });

    const needle = term.trim().toLowerCase();
    const matches: { slug: string; name: string }[] = [];
    for (const p of properties) {
      const amenities = safeJsonParse<string[]>(p.amenities, []);
      const amenityDetails = safeJsonParse<unknown[]>(p.amenityDetails, []);
      const haystack = [...amenities, ...amenityDetails.map((d) => JSON.stringify(d))].join(" | ").toLowerCase();
      if (haystack.includes(needle)) matches.push({ slug: p.slug, name: p.name });
    }

    return matches.length > 0 ? { found: true, properties: matches } : { found: false, properties: [] };
  },
};

// ── Registry ───────────────────────────────────────────────────────────────

/** Type-erased storage shape — every tool's handler is called only after its own `schema`
 * has validated the input, so the erasure to `unknown` below is never unsound in practice. */
interface HavenToolEntry {
  definition: ToolDefinition;
  schema: z.ZodType<unknown>;
  handler: (args: unknown) => Promise<unknown>;
}

function defineTool<Args>(spec: HavenToolSpec<Args>): HavenToolEntry {
  return {
    definition: spec.definition,
    schema: spec.schema,
    handler: spec.handler as (args: unknown) => Promise<unknown>,
  };
}

export const HAVEN_TOOLS: HavenToolEntry[] = [
  defineTool(resolveDatesTool),
  defineTool(listPropertiesTool),
  defineTool(getPropertyDetailsTool),
  defineTool(checkAvailabilityTool),
  defineTool(getQuoteTool),
  defineTool(findStayTool),
  defineTool(checkEarlyLateTool),
  defineTool(getFaqTool),
  defineTool(findAmenityTool),
];

export function getToolDefinitions(): ToolDefinition[] {
  return HAVEN_TOOLS.map((t) => t.definition);
}

/** Validate + dispatch a model-issued tool call. Never throws — errors become tool output. */
export async function runHavenTool(name: string, rawArgs: unknown): Promise<unknown> {
  const tool = HAVEN_TOOLS.find((t) => t.definition.name === name);
  if (!tool) return { error: `Unknown tool: ${name}` };

  const parsed = tool.schema.safeParse(rawArgs ?? {});
  if (!parsed.success) return { error: `Invalid arguments for ${name}: ${parsed.error.message}` };

  try {
    return await tool.handler(parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Tool execution failed." };
  }
}
