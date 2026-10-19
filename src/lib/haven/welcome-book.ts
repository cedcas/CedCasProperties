import "server-only";

/**
 * Welcome Book content — a safe, owner-sanitized excerpt of the house manual (source:
 * "BV-B34L21 House Manual v020325", owner-provided 2026-10-15).
 *
 * Scope (Cedric, owner update 2026-10-15, overriding the original same-day B34-only
 * scoping): the RESTAURANTS and THINGS-TO-DO lists are GLOBAL — they apply to every
 * public listing, including the Mickey in Lipa (B38) houses. Say "from our Welcome Book"
 * and combine them with a listing's own `neighborhoodPlaces` tool data when present; never
 * look up or invent a place for any property. HOUSE RULES, HOW-TOs, and CHECK-OUT STEPS
 * remain scoped to ONLY the two B34 listings: Cozy 1BR Haven (`cozy-1-bedroom`) and
 * Spacious 2BR Getaway (`spacious-2-bedroom`) — `getWelcomeBook` below returns `null` for
 * those three fields on every other slug, and `owner-facts.ts`/`system-prompt.ts` instruct
 * the model never to generalize them to a B38/Mickey listing.
 *
 * Deliberately EXCLUDED from the source excerpt, and so never present here: Wi-Fi details
 * (the manual only has a QR code), any door/lock/gate/keybox codes, the street/lot
 * address, staff phone numbers and emails, the host family bio, the dialect page (contains
 * derogatory terms), and the bars list. See `access-guard.ts` for the independent
 * enforcement that Haven never shares Wi-Fi/access details regardless of source.
 */

export const WELCOME_BOOK_SOURCE = "Welcome Book (BV-B34L21 House Manual, owner-provided 2026-10-15)";

export const WELCOME_BOOK_SLUGS = ["cozy-1-bedroom", "spacious-2-bedroom"] as const;
export type WelcomeBookSlug = (typeof WELCOME_BOOK_SLUGS)[number];

export interface WelcomeBookRestaurant {
  name: string;
  cuisine: string;
}

export interface WelcomeBookEntry {
  source: string;
  /** Global — every public listing (owner update, 2026-10-15). */
  restaurants: WelcomeBookRestaurant[];
  /** Global — every public listing (owner update, 2026-10-15). */
  restaurantsNote: string;
  /** Global — every public listing (owner update, 2026-10-15). */
  thingsToDo: string[];
  /** B34-only (`cozy-1-bedroom`, `spacious-2-bedroom`) — `null` for every other listing. */
  houseRules: string[] | null;
  /** B34-only (`cozy-1-bedroom`, `spacious-2-bedroom`) — `null` for every other listing. */
  howTos: string[] | null;
  /** B34-only (`cozy-1-bedroom`, `spacious-2-bedroom`) — `null` for every other listing. */
  checkOutSteps: string[] | null;
}

const RESTAURANTS: WelcomeBookRestaurant[] = [
  { name: "Casa Marikit", cuisine: "Italian (pasta, risotto, pizza)" },
  { name: "Lipa Grille Restaurant & Co", cuisine: "Filipino and Asian" },
  { name: "Gastro Publiko", cuisine: "Filipino and Asian, reasonably priced" },
  { name: "D'Ursi Pizza Autentica Pizzeria Napoletana", cuisine: "Neapolitan pizza" },
  { name: "PeBu Unli Steak House", cuisine: "Steakhouse with Filipino influence" },
  { name: "Ala Fiesta", cuisine: "Filipino, authentic Batangueño taste" },
  { name: "Gerry's Grill SM Lipa", cuisine: "Filipino, seafood" },
  { name: "Mumtaz Arabic & Persian Food Alley", cuisine: "Indian/Mediterranean (biryani, shawarma, samosas)" },
  { name: "Asian Flavours (inside Lima Park Hotel)", cuisine: "Filipino and Asian" },
  { name: "Don Juan, SM City Lipa", cuisine: "Filipino and Asian (food court)" },
];

const RESTAURANTS_NOTE = "The Welcome Book suggests checking TripAdvisor or the restaurant's Facebook page for the latest info.";

const THINGS_TO_DO: string[] = [
  "Milea Bee Farm",
  "Casa de Segunda (museum)",
  "Our Lady of Mt. Carmel Church",
  "San Sebastian Cathedral",
  "Old Grove Farmstead",
  "S&R Membership Shopping",
  "Museo ng Katipunan",
  "Peace Tower",
  "3C's Place",
  "Bulalacao Falls",
  "Kundiman Spa",
  "Pinkie's Farm",
  "Lipa Public Market",
];

const HOUSE_RULES: string[] = [
  "No pets inside or on the property. No parties/events without host approval. No smoking, vaping or e-cigarettes inside.",
  "Quiet hours 10 PM–8 AM. Check-in 2 PM, check-out 12 noon; early/late needs prior host approval (tell the team at least a day ahead).",
  "Max occupancy: 1-Bedroom listing 5, 2-Bedroom listing 9; extra guests/visitors need host approval.",
  "Leave the house as found (wash dishes, take out trash); caretaker inspects at check-out; guests liable for damage/missing items.",
  "No candles, incense or open flames; no cooking with strong-smelling ingredients.",
  "Turn off the aircon when not in use or when leaving (extra charges may apply).",
];

const HOW_TOS: string[] = [
  "Electric kettle: fill to max line, plug in, press power; it turns off automatically when boiled; pour carefully.",
  "Microwave: use a microwave-safe container, set the timer, press start, remove carefully (hot).",
  "Rice cooker: add rice and water to the marked amount, close the lid, turn on, wait for \"done\", fluff and serve.",
  "Induction cooker: compatible pot/pan, plug in, turn on, set temperature, turn off and unplug when done.",
  "Aircon: power on, set temperature with remote/panel, adjust fan, turn off when done.",
  "Electric fan: plug in, power on, adjust speed/direction. Iron: fill the water tank if needed, set temperature for the fabric, turn off and unplug when done.",
];

const CHECK_OUT_STEPS: string[] = [
  "Gather used towels next to the bed.",
  "Turn off the aircon and all electronics.",
  "Pull the door shut behind you.",
  "Return keys if any were provided.",
  "Let the caretaker know about an hour before leaving (otherwise the caretaker is usually there at the 12 noon check-out).",
];

/**
 * Restaurants and things-to-do are global (non-null for every slug, including an unknown
 * one); houseRules/howTos/checkOutSteps are `null` outside the two B34 slugs. Never widen
 * those three B34-only fields without a new owner decision.
 */
export function getWelcomeBook(slug: string): WelcomeBookEntry {
  const isB34 = isWelcomeBookSlug(slug);
  return {
    source: WELCOME_BOOK_SOURCE,
    restaurants: RESTAURANTS,
    restaurantsNote: RESTAURANTS_NOTE,
    thingsToDo: THINGS_TO_DO,
    houseRules: isB34 ? HOUSE_RULES : null,
    howTos: isB34 ? HOW_TOS : null,
    checkOutSteps: isB34 ? CHECK_OUT_STEPS : null,
  };
}

export function isWelcomeBookSlug(slug: string): slug is WelcomeBookSlug {
  return (WELCOME_BOOK_SLUGS as readonly string[]).includes(slug);
}
