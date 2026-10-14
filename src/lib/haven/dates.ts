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
}

const WEEKDAYS: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

const ORDINALS: Record<string, number> = {
  "1st": 1, first: 1,
  "2nd": 2, second: 2,
  "3rd": 3, third: 3,
  "4th": 4, fourth: 4,
  "5th": 5, fifth: 5,
};

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
  };
}

const MONTH_NAME_PATTERN = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|");
const WEEKDAY_NAME_PATTERN = Object.keys(WEEKDAYS).sort((a, b) => b.length - a.length).join("|");

export function resolveDates(expression: string, now: Date = new Date()): ResolvedDates | null {
  const expr = expression.trim().toLowerCase();
  const today = todayManila(now);

  // ISO range: "2026-12-24 to 2026-12-26" / "2026-12-24 - 2026-12-26"
  let m = expr.match(/(\d{4}-\d{2}-\d{2})\s*(?:-|to|–|through)\s*(\d{4}-\d{2}-\d{2})/);
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

  // "2nd Saturday of November" / "1st Friday in December"
  m = expr.match(
    new RegExp(`\\b(\\d(?:st|nd|rd|th)?|first|second|third|fourth|fifth)\\s+(${WEEKDAY_NAME_PATTERN})\\s+(?:of|in)\\s+(${MONTH_NAME_PATTERN})\\b`)
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
  m = expr.match(new RegExp(`\\bnext\\s+(${WEEKDAY_NAME_PATTERN})\\s*(?:-|to|–|through)\\s*(${WEEKDAY_NAME_PATTERN})\\b`));
  if (m) {
    const checkIn = nextOccurrence(today, WEEKDAYS[m[1]], true);
    const checkOut = nextOccurrence(checkIn, WEEKDAYS[m[2]], true);
    if (checkOut > checkIn) return toResult(checkIn, checkOut);
  }

  // "next Friday" alone
  m = expr.match(new RegExp(`\\bnext\\s+(${WEEKDAY_NAME_PATTERN})\\b`));
  if (m) {
    const checkIn = nextOccurrence(today, WEEKDAYS[m[1]], true);
    return toResult(checkIn, addUtcDays(checkIn, 1));
  }

  // "Dec 24-26" / "December 24 to 26" / "Dec 24 - Dec 26" / "Nov 30 to Dec 2"
  m = expr.match(
    new RegExp(
      `\\b(${MONTH_NAME_PATTERN})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:-|to|–|through)\\s*(?:(${MONTH_NAME_PATTERN})\\.?\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\b`
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
