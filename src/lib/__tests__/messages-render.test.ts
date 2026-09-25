// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    createElement("a", { href, ...rest }, children),
}));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => createElement("img", { src, alt }),
}));

import GuestMessageThreads from "@/components/admin/GuestMessageThreads";
import ThreadDetail from "@/components/admin/ThreadDetail";

/**
 * Rendered-behaviour regression for the Guest Messages booking-date defect.
 *
 * Mounts the REAL components in jsdom with fetch mocked to return exactly what the API routes
 * serialize (Prisma DateTime → NextResponse.json → UTC-midnight ISO strings), and asserts on the
 * rendered text. Runs under TZ=America/Chicago, Asia/Manila and UTC (vitest.config.ts).
 * Acceptance-test case: a Sep 28–30 2026 booking must read 9/28–9/30 (a Preview showed 9/27–9/29).
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TZ = process.env.TZ;

// jsdom doesn't implement scrollIntoView (ThreadDetail auto-scrolls the feed).
Element.prototype.scrollIntoView = () => {};

// A stay plus a message instant, both as the API puts them on the wire.
const BOOKING = JSON.parse(
  JSON.stringify({
    id: 7,
    guestName: "Rhoan Test",
    guestEmail: "guest@example.com",
    guestPhone: "+639171234567",
    checkIn: new Date("2026-09-28"),
    checkOut: new Date("2026-09-30"),
    status: "confirmed",
    optedOutAt: null,
    property: { id: 3, name: "Mickey Sleeps 15", type: "3 Room 2 Floor Property", featuredImage: null },
  })
);
// An old instant (so relTime falls through to a date) at 02:30Z — a different calendar day
// in Chicago (Aug 31, 9:30 pm) than in Manila / UTC (Sep 1).
const SENT_AT = "2026-09-01T02:30:00.000Z";
const EXPECTED_LOCAL_DAY = TZ === "America/Chicago" ? "Aug 31" : "Sep 1";

const mounted: Root[] = [];
afterEach(() => {
  for (const r of mounted.splice(0)) act(() => r.unmount());
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

async function render(el: React.ReactElement, routes: Record<string, unknown>): Promise<string> {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const key = Object.keys(routes).find((k) => String(url).startsWith(k));
      if (!key) throw new Error(`unmocked fetch ${url}`);
      return { ok: true, status: 200, json: async () => routes[key] };
    })
  );
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  mounted.push(root);
  await act(async () => {
    root.render(el);
  });
  await act(async () => {
    await Promise.resolve();
  });
  return host.textContent ?? "";
}

describe(`Guest Messages rendered output (running under TZ=${TZ})`, () => {
  it("thread LIST shows the booked calendar dates and a local-time lastSentAt", async () => {
    const text = await render(createElement(GuestMessageThreads), {
      "/api/admin/guest-messages/threads": {
        threads: [
          {
            bookingId: BOOKING.id,
            lastSentAt: SENT_AT,
            lastSubject: "Check-in details",
            lastPreview: "See you soon",
            guestName: BOOKING.guestName,
            guestEmail: BOOKING.guestEmail,
            status: BOOKING.status,
            checkIn: BOOKING.checkIn,
            checkOut: BOOKING.checkOut,
            property: BOOKING.property,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
        hasMore: false,
      },
    });
    expect(text).toContain("Rhoan, 3 Room 2 Floor Property, 9/28–9/30");
    expect(text).not.toContain("9/27");
    expect(text).toContain(EXPECTED_LOCAL_DAY); // genuine timestamp keeps local-time behaviour
  });

  it("thread HEADER shows the booked calendar dates and a local-time message time", async () => {
    const text = await render(createElement(ThreadDetail, { bookingId: BOOKING.id }), {
      "/api/admin/guest-messages/7": {
        booking: BOOKING,
        messages: [
          {
            id: 1,
            subject: "Check-in details",
            body: "See you soon",
            trigger: "manual",
            channel: "email",
            direction: "outbound",
            status: "sent",
            notes: null,
            fromNumber: null,
            toNumber: null,
            sentAt: SENT_AT,
            quickReplyId: null,
          },
        ],
      },
      "/api/admin/quick-replies": [],
    });
    expect(text).toContain("Rhoan, 3 Room 2 Floor Property, 9/28–9/30");
    expect(text).not.toContain("9/27");
    expect(text).toContain(`${EXPECTED_LOCAL_DAY},`); // fmtTime → "Aug 31, 9:30 pm" / "Sep 1, …"
  });
});
