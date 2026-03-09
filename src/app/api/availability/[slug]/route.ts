import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── iCal parser ────────────────────────────────────────────────────────────
function parseIcsDate(raw: string): Date | null {
  const s = raw.trim();
  // DATE-only: 20241201
  if (/^\d{8}$/.test(s)) {
    return new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00Z`);
  }
  // DATETIME: 20241201T140000Z or 20241201T140000
  if (/^\d{8}T\d{6}/.test(s)) {
    const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}${s.endsWith("Z") ? "Z" : ""}`;
    return new Date(iso);
  }
  return null;
}

interface DateRange { start: Date; end: Date }

function parseIcs(icsText: string): DateRange[] {
  const ranges: DateRange[] = [];
  const lines = icsText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  let inEvent = false;
  let start: Date | null = null;
  let end: Date | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      start = null;
      end = null;
    } else if (line === "END:VEVENT") {
      if (start && end) ranges.push({ start, end });
      inEvent = false;
    } else if (inEvent) {
      // DTSTART or DTSTART;VALUE=DATE or DTSTART;TZID=...
      if (/^DTSTART[;:]/.test(line)) {
        const val = line.split(":").slice(1).join(":");
        start = parseIcsDate(val);
      } else if (/^DTEND[;:]/.test(line)) {
        const val = line.split(":").slice(1).join(":");
        end = parseIcsDate(val);
      }
    }
  }

  return ranges;
}

function datesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

// ── GET /api/availability/[slug]?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD ───
// Returns { available: boolean, conflicts: string[] }
// If no dates supplied, returns all blocked ranges from today.

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const checkInStr  = searchParams.get("checkIn");
  const checkOutStr = searchParams.get("checkOut");
  const excludeId   = searchParams.get("excludeBookingId"); // skip when re-checking own booking

  const property = await prisma.property.findUnique({
    where: { slug },
    select: {
      id: true,
      airbnbIcsUrl: true,
      bookings: {
        where: { status: { in: ["confirmed", "pending"] } },
        select: { id: true, checkIn: true, checkOut: true },
      },
    },
  });

  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ── Collect blocked ranges ────────────────────────────────────────────────
  const blockedRanges: DateRange[] = property.bookings
    .filter((b) => String(b.id) !== excludeId)
    .map((b) => ({ start: b.checkIn, end: b.checkOut }));

  // ── Fetch Airbnb iCal if configured ──────────────────────────────────────
  let airbnbError: string | null = null;
  if (property.airbnbIcsUrl) {
    try {
      const res = await fetch(property.airbnbIcsUrl, {
        headers: { "User-Agent": "CedCasProperties/1.0" },
        // 5-second timeout
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const text = await res.text();
        const airbnbRanges = parseIcs(text);
        blockedRanges.push(...airbnbRanges);
      }
    } catch {
      airbnbError = "Could not fetch Airbnb calendar. Blocking based on local bookings only.";
    }
  }

  // ── If specific dates supplied, check overlap ─────────────────────────────
  if (checkInStr && checkOutStr) {
    const checkIn  = new Date(checkInStr);
    const checkOut = new Date(checkOutStr);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
    }

    const conflicts: string[] = [];
    for (const range of blockedRanges) {
      if (datesOverlap(checkIn, checkOut, range.start, range.end)) {
        conflicts.push(
          `${range.start.toISOString().split("T")[0]} – ${range.end.toISOString().split("T")[0]}`
        );
      }
    }

    return NextResponse.json({
      available: conflicts.length === 0,
      conflicts,
      ...(airbnbError ? { warning: airbnbError } : {}),
    });
  }

  // ── No dates: return all blocked ranges from today ────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureRanges = blockedRanges
    .filter((r) => r.end > today)
    .map((r) => ({
      start: r.start.toISOString().split("T")[0],
      end:   r.end.toISOString().split("T")[0],
    }));

  return NextResponse.json({
    blockedRanges: futureRanges,
    ...(airbnbError ? { warning: airbnbError } : {}),
  });
}
