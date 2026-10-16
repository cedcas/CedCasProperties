import { addUtcDays, manilaTodayKey, toUtcMidnight, utcDateKey } from "@/lib/dates";

/**
 * Natural-language date resolution for the `resolve_dates` tool (src/lib/haven/tools.ts).
 *
 * The model must never compute a stay's dates itself — it calls this tool with the
 * guest's phrase and relays the result verbatim, including `interpreted` so Haven can
 * confirm what it understood ("That's Saturday, Nov 14, 2026 — one night. Sound right?").
 * Pure function: no DB, no provider call, anchored to "now" only through the optional
 * `now` parameter (defaults to the real clock) so tests can pin it. All arithmetic is in
 * Manila's calendar date (UTC+8, no DST) via the already-tested helpers in src/lib/dates.ts.
 */

export interface ResolvedDates {
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  /** Human-readable confirmation text, e.g. "Saturday, November 14, 2026 (1 night)". */
  interpreted: string;
  /** The guest-facing stay range — see `buildStayLabel` below. */
  stayLabel: StayLabel;
}

export interface StayLabel {
  en: string;
  tl: string;
  /** Identical to `tl` — Batangueño flavor lives in surrounding prose, not the date range. */
  btg: string;
}

const EN_WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EN_MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TL_WEEKDAYS_FULL = ["Linggo", "Lunes", "Martes", "Miyerkules", "Huwebes", "Biyernes", "Sabado"];
const TL_MONTHS_SHORT = ["Ene", "Peb", "Mar", "Abr", "May", "Hun", "Hul", "Ago", "Set", "Okt", "Nob", "Dis"];

function enDatePart(d: Date): string {
  return `${EN_WEEKDAYS_SHORT[d.getUTCDay()]}, ${EN_MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function tlDatePart(d: Date): string {
  return `${TL_WEEKDAYS_FULL[d.getUTCDay()]}, ${TL_MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/**
 * The guest-facing stay range, with the end date ALWAYS the check-out date, never the last
 * occupied night (the live bug: a Thu check-in/Sat check-out, 2-night stay, got read back
 * as "Thursday → Friday" — the last NIGHT, not the check-out date). `nights` is always
 * `checkOut - checkIn`, matching get_quote/find_stay's own night count. See
 * post-process.ts's `fixStayRangeEndDate` backstop and system-prompt.ts's "copy stayLabel
 * verbatim" rule, which both depend on this being the single source of truth for how a
 * stay's range is worded.
 */
function buildStayLabelFromDates(checkIn: Date, checkOut: Date): StayLabel {
  const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000);
  const ciYear = checkIn.getUTCFullYear();
  const coYear = checkOut.getUTCFullYear();
  const ciYearSuffix = ciYear !== coYear ? `, ${ciYear}` : "";

  const en =
    `${enDatePart(checkIn)}${ciYearSuffix} → ${enDatePart(checkOut)}, ${coYear} (check-out) · ` +
    `${nights} night${nights === 1 ? "" : "s"}`;
  const tl = `${tlDatePart(checkIn)}${ciYearSuffix} → ${tlDatePart(checkOut)}, ${coYear} (check-out) · ${nights} gabi`;

  return { en, tl, btg: tl };
}

/**
 * String-input wrapper for callers outside this module (tools.ts, chat-service.ts,
 * post-process.ts) that only have YYYY-MM-DD checkIn/checkOut, not an already-parsed Date.
 * Returns `null` for an invalid or inverted range rather than throwing — callers already
 * validate checkIn/checkOut before reaching this point, so `null` is only ever a defensive
 * fallback, never the expected path.
 */
export function buildStayLabel(checkIn: string, checkOut: string): StayLabel | null {
  const ci = toUtcMidnight(checkIn);
  const co = toUtcMidnight(checkOut);
  if (isNaN(ci.getTime()) || isNaN(co.getTime()) || co <= ci) return null;
  return buildStayLabelFromDates(ci, co);
}

// Tagalog/Batangueño weekday and month names alongside the English ones, so the same
// patterns below understand English, Tagalog, Batangueño, and Taglish phrasing without a
// separate parse path per language.
const WEEKDAYS: Record<string, number> = {
  sun: 0, sunday: 0, linggo: 0,
  mon: 1, monday: 1, lunes: 1,
  tue: 2, tues: 2, tuesday: 2, martes: 2,
  wed: 3, wednesday: 3, miyerkules: 3, miyercoles: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4, huwebes: 4,
  fri: 5, friday: 5, biyernes: 5,
  sat: 6, saturday: 6, sabado: 6,
};

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, enero: 0,
  feb: 1, february: 1, pebrero: 1,
  mar: 2, march: 2, marso: 2,
  apr: 3, april: 3, abril: 3,
  may: 4, mayo: 4,
  jun: 5, june: 5, hunyo: 5,
  jul: 6, july: 6, hulyo: 6,
  aug: 7, august: 7, agosto: 7,
  sep: 8, sept: 8, september: 8, setyembre: 8,
  oct: 9, october: 9, oktubre: 9,
  nov: 10, november: 10, nobyembre: 10, nobiembre: 10,
  dec: 11, december: 11, disyembre: 11,
};

const ORDINALS: Record<string, number> = {
  "1st": 1, first: 1, una: 1, unang: 1,
  "2nd": 2, second: 2, ikalawa: 2, ikalawang: 2, pangalawa: 2, pangalawang: 2,
  "3rd": 3, third: 3, ikatlo: 3, ikatlong: 3, pangatlo: 3, pangatlong: 3,
  "4th": 4, fourth: 4, ikaapat: 4, ikaapatna: 4,
  "5th": 5, fifth: 5, ikalima: 5, ikalimang: 5,
};

/** Word-form ordinal keys only (the digit forms like "2nd" are matched by their own pattern). */
const ORDINAL_WORD_PATTERN = Object.keys(ORDINALS)
  .filter((k) => /^[a-z]+$/.test(k))
  .sort((a, b) => b.length - a.length)
  .join("|");

/** Today's Manila calendar date, anchored at UTC midnight. */
function todayManila(now: Date): Date {
  return toUtcMidnight(manilaTodayKey(now));
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): Date | null {
  const first = new Date(Date.UTC(year, month, 1));
  const firstWeekday = first.getUTCDay();
  const day = 1 + ((weekday - firstWeekday + 7) % 7) + (nth - 1) * 7;
  const date = new Date(Date.UTC(year, month, day));
  return date.getUTCMonth() === month ? date : null;
}

/** Next calendar date (>= today, or > today when strictlyAfter) landing on `weekday`. */
function nextOccurrence(today: Date, weekday: number, strictlyAfter: boolean): Date {
  const dow = today.getUTCDay();
  let diff = (weekday - dow + 7) % 7;
  if (diff === 0 && strictlyAfter) diff = 7;
  return addUtcDays(today, diff);
}

/** Friday–Sunday spanning "today" if today is already Fri/Sat/Sun, else the coming one. */
function thisWeekendRange(today: Date): { checkIn: Date; checkOut: Date } {
  const dow = today.getUTCDay();
  if (dow === 5) return { checkIn: today, checkOut: addUtcDays(today, 2) }; // Fri -> Sun
  if (dow === 6) return { checkIn: today, checkOut: addUtcDays(today, 1) }; // Sat -> Sun
  if (dow === 0) return { checkIn: addUtcDays(today, -1), checkOut: addUtcDays(today, 1) }; // Sat -> Sun, today is the Sun night
  const friday = addUtcDays(today, (5 - dow + 7) % 7);
  return { checkIn: friday, checkOut: addUtcDays(friday, 2) };
}

/** Resolve a bare "Month Day" to the next future occurrence of that calendar date. */
function resolveMonthDay(today: Date, month: number, day: number): Date {
  const year = today.getUTCFullYear();
  let candidate = new Date(Date.UTC(year, month, day));
  if (candidate < today) candidate = new Date(Date.UTC(year + 1, month, day));
  return candidate;
}

function formatInterpreted(checkIn: Date, checkOut: Date): string {
  const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const nightWord = nights === 1 ? "1 night" : `${nights} nights`;
  return nights <= 1 && checkOut.getTime() - checkIn.getTime() === 86_400_000
    ? `${fmt(checkIn)} (${nightWord})`
    : `${fmt(checkIn)} – ${fmt(checkOut)} (${nightWord})`;
}

function toResult(checkIn: Date, checkOut: Date): ResolvedDates {
  return {
    checkIn: utcDateKey(checkIn),
    checkOut: utcDateKey(checkOut),
    interpreted: formatInterpreted(checkIn, checkOut),
    stayLabel: buildStayLabelFromDates(checkIn, checkOut),
  };
}

const MONTH_NAME_PATTERN = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|");
const WEEKDAY_NAME_PATTERN = Object.keys(WEEKDAYS).sort((a, b) => b.length - a.length).join("|");

/**
 * Every word/symbol guests use to join a check-in phrase to a check-out phrase — English
 * ("to", "until", "through", a hyphen/en dash) and Tagalog/Batangueño ("hanggang", "until"
 * is also understood in Taglish). "hanggang" was missing here, so "Nobyembre 19 hanggang
 * 21" fell through to the single-date pattern below and silently resolved to a 1-night
 * stay (Nov 19 -> Nov 20) instead of the intended 2-night range (Nov 19 -> Nov 21) — the
 * live regression this constant fixes. A leading "mula"/"from" before the check-in phrase
 * needs no special handling: it's just unmatched prefix text, since none of these patterns
 * anchor to the start of the expression.
 */
const RANGE_SEP = String.raw`(?:-|to|–|through|until|hanggang)`;

export function resolveDates(expression: string, now: Date = new Date()): ResolvedDates | null {
  const expr = expression.trim().toLowerCase();
  const today = todayManila(now);

  // ISO range: "2026-12-24 to 2026-12-26" / "2026-12-24 - 2026-12-26"
  let m = expr.match(new RegExp(`(\\d{4}-\\d{2}-\\d{2})\\s*${RANGE_SEP}\\s*(\\d{4}-\\d{2}-\\d{2})`));
  if (m) {
    const checkIn = toUtcMidnight(m[1]);
    const checkOut = toUtcMidnight(m[2]);
    if (!isNaN(checkIn.getTime()) && !isNaN(checkOut.getTime()) && checkOut > checkIn) {
      return toResult(checkIn, checkOut);
    }
  }

  // ISO single: "2026-12-24"
  m = expr.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (m) {
    const checkIn = toUtcMidnight(m[1]);
    if (!isNaN(checkIn.getTime())) return toResult(checkIn, addUtcDays(checkIn, 1));
  }

  // "2nd Saturday of November" / "1st Friday in December" / "ikalawang Sabado ng Nobyembre"
  m = expr.match(
    new RegExp(`\\b(\\d(?:st|nd|rd|th)?|${ORDINAL_WORD_PATTERN})\\s+(${WEEKDAY_NAME_PATTERN})\\s+(?:of|in|ng)\\s+(${MONTH_NAME_PATTERN})\\b`)
  );
  if (m) {
    const nth = ORDINALS[m[1]] ?? ORDINALS[`${m[1]}${m[1] === "1" ? "st" : m[1] === "2" ? "nd" : m[1] === "3" ? "rd" : "th"}`];
    const weekday = WEEKDAYS[m[2]];
    const month = MONTHS[m[3]];
    if (nth && weekday !== undefined && month !== undefined) {
      let year = today.getUTCFullYear();
      let date = nthWeekdayOfMonth(year, month, weekday, nth);
      if (date && date < today) {
        year += 1;
        date = nthWeekdayOfMonth(year, month, weekday, nth);
      }
      if (date) return toResult(date, addUtcDays(date, 1));
    }
  }

  // "this weekend" / "the weekend" / "next weekend"
  if (/\b(this|the)\s+weekend\b/.test(expr)) {
    const { checkIn, checkOut } = thisWeekendRange(today);
    return toResult(checkIn, checkOut);
  }
  if (/\bnext\s+weekend\b/.test(expr)) {
    const { checkIn } = thisWeekendRange(today);
    const nextFriday = addUtcDays(checkIn, 7);
    return toResult(nextFriday, addUtcDays(nextFriday, 2));
  }

  // "next Friday to Sunday" (also "next Fri-Sun")
  m = expr.match(new RegExp(`\\bnext\\s+(${WEEKDAY_NAME_PATTERN})\\s*${RANGE_SEP}\\s*(${WEEKDAY_NAME_PATTERN})\\b`));
  if (m) {
    const checkIn = nextOccurrence(today, WEEKDAYS[m[1]], true);
    const checkOut = nextOccurrence(checkIn, WEEKDAYS[m[2]], true);
    if (checkOut > checkIn) return toResult(checkIn, checkOut);
  }

  // "next Friday" alone / "susunod na Sabado" (also "sa susunod na Sabado")
  m = expr.match(new RegExp(`\\b(?:next|susunod\\s+na)\\s+(${WEEKDAY_NAME_PATTERN})\\b`));
  if (m) {
    const checkIn = nextOccurrence(today, WEEKDAYS[m[1]], true);
    return toResult(checkIn, addUtcDays(checkIn, 1));
  }

  // "Dec 24-26" / "December 24 to 26" / "Dec 24 - Dec 26" / "Nov 30 to Dec 2"
  m = expr.match(
    new RegExp(
      `\\b(${MONTH_NAME_PATTERN})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*${RANGE_SEP}\\s*(?:(${MONTH_NAME_PATTERN})\\.?\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\b`
    )
  );
  if (m) {
    const startMonth = MONTHS[m[1]];
    const endMonth = m[3] ? MONTHS[m[3]] : startMonth;
    const startDay = parseInt(m[2], 10);
    const endDay = parseInt(m[4], 10);
    const checkIn = resolveMonthDay(today, startMonth, startDay);
    let checkOut = new Date(Date.UTC(checkIn.getUTCFullYear(), endMonth, endDay));
    if (checkOut <= checkIn) checkOut = new Date(Date.UTC(checkIn.getUTCFullYear() + 1, endMonth, endDay));
    if (checkOut > checkIn) return toResult(checkIn, checkOut);
  }

  // "Dec 24" / "December 24th" (single date)
  m = expr.match(new RegExp(`\\b(${MONTH_NAME_PATTERN})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`));
  if (m) {
    const checkIn = resolveMonthDay(today, MONTHS[m[1]], parseInt(m[2], 10));
    return toResult(checkIn, addUtcDays(checkIn, 1));
  }

  // "tomorrow"
  if (/\btomorrow\b/.test(expr)) {
    const checkIn = addUtcDays(today, 1);
    return toResult(checkIn, addUtcDays(checkIn, 1));
  }

  // "today" / "tonight"
  if (/\b(today|tonight)\b/.test(expr)) {
    return toResult(today, addUtcDays(today, 1));
  }

  // bare weekday, no "next": nearest future occurrence, e.g. "Saturday"
  m = expr.match(new RegExp(`^(${WEEKDAY_NAME_PATTERN})$`));
  if (m) {
    const checkIn = nextOccurrence(today, WEEKDAYS[m[1]], false);
    return toResult(checkIn, addUtcDays(checkIn, 1));
  }

  return null;
}
