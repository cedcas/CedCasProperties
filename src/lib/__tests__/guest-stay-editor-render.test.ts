// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";

const refresh = vi.fn();
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    createElement("a", { href, ...rest }, children),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import GuestStayEditor from "@/components/admin/GuestStayEditor";
import type { AmendableField, AmendmentReview, BookingSnapshot } from "@/lib/booking-amendment";

/**
 * Rendered Edit → Review → Save flow: the REAL component mounted in jsdom, driven through
 * the DOM the way an admin would, with only `fetch` stubbed. Runs under America/Chicago,
 * UTC and Asia/Manila — the stay below spans the US spring-forward night (14 Mar 2027),
 * so a date rendered or submitted in local time would be off by a day in one of them.
 *
 * What this does NOT prove: that the server accepts these requests. That is the job of
 * the route/database suite (src/lib/__tests__/db/booking-amendment.dbtest.ts).
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SNAPSHOT: BookingSnapshot = {
  guestName: "Ana Santos",
  guestEmail: "ana@example.com",
  guestPhone: "+639171234567",
  guests: 2,
  propertyId: 1,
  checkIn: "2027-03-13",
  checkOut: "2027-03-15",
};
const ALL: AmendableField[] = ["guestName", "guestEmail", "guestPhone", "guests", "propertyId", "checkIn", "checkOut"];
const PROPERTIES = [
  { id: 1, name: "Cozy 1BR", maxGuests: 4 },
  { id: 2, name: "Spacious 2BR", maxGuests: 6 },
];

const REVIEW: AmendmentReview = {
  bookingId: 130,
  status: "confirmed",
  phase: "upcoming",
  expectedUpdatedAt: "2027-03-01T02:00:00.000Z",
  changes: [{ field: "checkOut", label: "Check-out", before: "Mon, Mar 15, 2027", after: "Tue, Mar 16, 2027" }],
  stayChanged: true,
  nights: { before: 2, after: 3 },
  property: { before: { id: 1, name: "Cozy 1BR" }, after: { id: 1, name: "Cozy 1BR" } },
  inventory: { alsoBlocks: ["Spacious 2BR"], releases: [] },
  conflicts: [],
  financial: {
    mode: "preserve",
    paymentMethod: "gcash",
    hasStripePayment: false,
    stored: { nightlyTotal: 4000, extraGuestFee: null, discountCode: null, discountAmount: null, stripeFee: null, total: 4000 },
    reference: { ok: true, nightlyTotal: 6000, extraGuestFee: 0, discountAmount: 0, stripeFee: 0, total: 6000, difference: 2000 },
  },
  messages: {
    reschedule: [{ name: "Thanks for staying", from: "2027-03-15T04:00:00.000Z", to: "2027-03-16T04:00:00.000Z" }],
    withdraw: [],
    create: [],
    held: [],
    alreadySent: [],
    inFlight: [],
    notReplayed: [],
  },
  warnings: [],
  channelNote: "Airbnb and other connected calendars pick this change up the next time they import the HIL feed.",
};

type Reply = { status?: number; body: unknown };
let calls: Record<string, unknown>[] = [];
const mounted: Root[] = [];
let host: HTMLDivElement;

afterEach(() => {
  for (const r of mounted.splice(0)) act(() => r.unmount());
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  refresh.mockClear();
  calls = [];
});

function mount(props: Partial<Parameters<typeof GuestStayEditor>[0]> = {}, replies: Reply[] = []) {
  const queue = [...replies];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: { body: string }) => {
      expect(url).toBe("/api/admin/bookings/130/amend");
      calls.push(JSON.parse(init.body));
      const next = queue.shift();
      if (!next) throw new Error("unexpected fetch");
      const status = next.status ?? 200;
      return { ok: status < 400, status, json: async () => next.body };
    })
  );
  host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  mounted.push(root);
  act(() => {
    root.render(
      createElement(GuestStayEditor, {
        bookingId: 130,
        snapshot: SNAPSHOT,
        propertyName: "Cozy 1BR",
        propertySlug: "cozy-1-bedroom",
        properties: PROPERTIES,
        editable: ALL,
        notice: null,
        blockedReason: null,
        ...props,
      })
    );
  });
}

const text = () => host.textContent ?? "";
const button = (name: RegExp) =>
  [...host.querySelectorAll("button")].find((b) => name.test(b.textContent ?? "")) as HTMLButtonElement | undefined;
const byLabel = (label: string) => {
  const el = [...host.querySelectorAll("label")].find((l) => l.textContent?.trim().startsWith(label));
  return el ? (document.getElementById(el.getAttribute("for")!) as HTMLInputElement) : null;
};

async function click(name: RegExp) {
  const b = button(name);
  if (!b) throw new Error(`no button ${name}`);
  await act(async () => {
    b.click();
  });
}

async function type(label: string, value: string) {
  const el = byLabel(label)!;
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  });
}

describe("Guest & Stay editor — rendered flow", () => {
  it("shows the stay's calendar dates, not a timezone-shifted day", () => {
    mount();
    expect(text()).toMatch(/March 13, 2027/);
    expect(text()).toMatch(/March 15, 2027/);
    expect(text()).not.toMatch(/March 1[24], 2027/);
    expect(text()).toContain("Nights2");
  });

  it("never hides editing silently: says why when the viewer lacks permission or the booking is locked", async () => {
    mount({ blockedReason: "Your account does not have the Bookings permission. An admin can switch it on for you under Users." });
    expect(button(/Edit/)).toBeUndefined();
    expect(text()).toContain("Editing locked");
    expect(text()).toContain("Guest and stay details cannot be edited here. Your account does not have the Bookings permission");
    act(() => mounted.pop()!.unmount());
    document.body.innerHTML = "";

    mount({ editable: [], notice: "This booking is cancelled and cannot be amended. Amending never reactivates a booking." });
    expect(button(/Edit/)).toBeUndefined();
    expect(text()).toContain("Editing locked");
    expect(text()).toContain("This booking is cancelled and cannot be amended");
  });

  it("a past booking still offers Edit, limited to contact details, and says so", async () => {
    mount({ editable: ["guestName", "guestEmail", "guestPhone"], notice: "This stay has ended. Only contact details can be corrected." });
    expect(text()).toContain("This stay has ended. Only contact details can be corrected.");
    expect(text()).not.toContain("Editing locked");
    await click(/Edit/);
    expect(byLabel("Email")!.value).toBe("ana@example.com");
    for (const locked of ["Guests", "Property", "Check-in", "Check-out"]) expect(byLabel(locked)).toBeNull();
  });

  it("edit mode: every field is a labelled input pre-filled from the booking, focus moves into the form", async () => {
    mount();
    await click(/Edit/);
    expect(byLabel("Name")!.value).toBe("Ana Santos");
    expect(byLabel("Email")!.type).toBe("email");
    expect(byLabel("Phone")!.type).toBe("tel");
    expect(byLabel("Guests")!.value).toBe("2");
    expect((byLabel("Property") as unknown as HTMLSelectElement).value).toBe("1");
    expect([byLabel("Check-in")!.type, byLabel("Check-in")!.value]).toEqual(["date", "2027-03-13"]);
    expect([byLabel("Check-out")!.value, byLabel("Check-out")!.min]).toEqual(["2027-03-15", "2027-03-14"]);
    expect(document.activeElement).toBe(byLabel("Name"));
    expect(calls).toEqual([]);
  });

  it("Cancel discards the draft without contacting the server", async () => {
    mount();
    await click(/Edit/);
    await type("Name", "Someone Else");
    await click(/^Cancel$/);
    expect(text()).toContain("Ana Santos");
    expect(text()).not.toContain("Someone Else");
    expect(byLabel("Name")).toBeNull();
    expect(calls).toEqual([]);
  });

  it("refuses to review when nothing changed", async () => {
    mount();
    await click(/Edit/);
    await click(/Review changes/);
    expect(host.querySelector('[role="alert"]')!.textContent).toContain("Nothing has changed");
    expect(calls).toEqual([]);
  });

  it("Edit → Review → Save: sends only changed fields, shows before/after and impact, requires a reason", async () => {
    mount({}, [{ body: { review: REVIEW } }, { body: { outcome: "applied", review: REVIEW, updatedAt: "x", propagation: { verified: true } } }]);
    await click(/Edit/);
    await type("Check-out", "2027-03-16");
    expect(text()).toContain("3 nights");

    await click(/Review changes/);
    expect(calls[0]).toEqual({ action: "preview", changes: { checkOut: "2027-03-16" } });

    const heading = host.querySelector("h2")!;
    expect(heading.textContent).toBe("Review amendment");
    expect(document.activeElement).toBe(heading);
    const t = text();
    expect(t).toContain("Booking #130 keeps its number, its confirmed status and its history");
    expect(t).toMatch(/Check-out\s*Before\s*Mon, Mar 15, 2027\s*After\s*Tue, Mar 16, 2027/);
    expect(t).toContain("Nights: 2 → 3");
    expect(t).toContain("these listings will be blocked for the new dates: Spacious 2BR");
    expect(t).toContain("The agreed total of ₱4,000 is kept");
    expect(t).toContain("prices at ₱6,000 — ₱2,000 more than the agreed total");
    expect(t).toContain("next time they import the HIL feed");
    expect(t).toContain("“Thanks for staying” moves from Mar 15, 12:00 PM (Manila) to Mar 16, 12:00 PM (Manila)");
    expect(t).toContain("The guest is not notified of this amendment automatically");

    // No reason → nothing is sent, the field is flagged.
    await click(/Save amendment/);
    expect(calls).toHaveLength(1);
    const reason = byLabel("Reason for this amendment") as unknown as HTMLTextAreaElement;
    expect(reason.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(reason);

    await type("Reason for this amendment", "Guest asked to stay one more night");
    await click(/Save amendment/);
    expect(calls[1]).toEqual({
      action: "commit",
      changes: { checkOut: "2027-03-16" },
      reason: "Guest asked to stay one more night",
      expectedUpdatedAt: "2027-03-01T02:00:00.000Z",
      pricing: "preserve",
    });
    expect(host.querySelector('[role="status"]')!.textContent).toContain("Amendment saved.");
    expect(host.querySelector('[role="status"]')!.textContent).toContain("next time they import");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("a conflict found at review blocks Save and names what is in the way", async () => {
    const blocked = { ...REVIEW, conflicts: [{ label: "Booking #131 — Ben Cruz", range: "2027-03-15 – 2027-03-17", kind: "booking" as const }] };
    mount({}, [{ body: { review: blocked } }]);
    await click(/Edit/);
    await type("Check-out", "2027-03-16");
    await click(/Review changes/);
    expect(text()).toContain("These dates are not available, so this amendment cannot be saved.");
    expect(text()).toContain("Booking #131 — Ben Cruz (2027-03-15 – 2027-03-17)");
    expect(button(/Save amendment/)!.disabled).toBe(true);
  });

  it("a conflict that appears between review and save is reported and nothing is claimed as saved", async () => {
    mount({}, [
      { body: { review: REVIEW } },
      { status: 409, body: { error: "Those dates are not available for this property. Nothing was changed.", code: "conflict", conflicts: [{ label: "Booking #140 — New Guest", range: "2027-03-15 – 2027-03-16", kind: "booking" }] } },
    ]);
    await click(/Edit/);
    await type("Check-out", "2027-03-16");
    await click(/Review changes/);
    await type("Reason for this amendment", "Guest asked to extend");
    await click(/Save amendment/);
    const alert = host.querySelector('[role="alert"]')!.textContent!;
    expect(alert).toContain("Nothing was changed");
    expect(alert).toContain("Booking #140 — New Guest");
    expect(host.querySelector('[role="status"]')).toBeNull();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("a stale save offers a reload instead of overwriting", async () => {
    mount({}, [{ body: { review: REVIEW } }, { status: 409, body: { error: "This booking was changed by someone else after you opened it.", code: "stale" } }]);
    await click(/Edit/);
    await type("Check-out", "2027-03-16");
    await click(/Review changes/);
    await type("Reason for this amendment", "Guest asked to extend");
    await click(/Save amendment/);
    expect(text()).toContain("changed by someone else");
    expect(button(/Reload booking/)).toBeDefined();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("server field errors return to the form, attached to the right inputs", async () => {
    mount({}, [{ status: 400, body: { error: "Some details need attention.", code: "invalid", fieldErrors: { guestEmail: "Enter a valid email address.", guests: "Cozy 1BR accommodates up to 4 guests." } } }]);
    await click(/Edit/);
    await type("Email", "nope");
    await type("Guests", "9");
    await click(/Review changes/);
    expect(calls[0]).toEqual({ action: "preview", changes: { guestEmail: "nope", guests: "9" } });
    const email = byLabel("Email")!;
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(email.getAttribute("aria-describedby")!.split(" ")[0])!.textContent).toBe("Enter a valid email address.");
    expect(byLabel("Guests")!.getAttribute("aria-invalid")).toBe("true");
  });

  it("a dropped connection during save claims neither success nor failure", async () => {
    mount({}, [{ body: { review: REVIEW } }]);
    await click(/Edit/);
    await type("Check-out", "2027-03-16");
    await click(/Review changes/);
    await type("Reason for this amendment", "Guest asked to extend");
    await click(/Save amendment/); // second fetch throws ("unexpected fetch")
    expect(text()).toContain("the outcome is unknown");
    expect(button(/Reload booking/)).toBeDefined();
    expect(host.querySelector('[role="status"]')).toBeNull();
  });

  it("an in-progress stay shows check-in and property as locked, check-out still editable", async () => {
    mount({ editable: ["guestName", "guestEmail", "guestPhone", "guests", "checkOut"], notice: "This stay is in progress, so check-in and property can no longer be changed." });
    expect(text()).toContain("This stay is in progress");
    await click(/Edit/);
    expect(byLabel("Check-in")).toBeNull();
    expect(byLabel("Property")).toBeNull();
    expect(byLabel("Check-out")!.value).toBe("2027-03-15");
    expect(text()).toMatch(/Check-in.*March 13, 2027.*locked/);
  });

  it("an incomplete propagation is shown as such, with a retry that reports recovery", async () => {
    const incomplete = { outcome: "applied_propagation_incomplete", review: REVIEW, updatedAt: "x", propagation: { verified: false } };
    mount({}, [{ body: { review: REVIEW } }, { body: incomplete }, { body: { verified: true } }]);
    await click(/Edit/);
    await type("Check-out", "2027-03-16");
    await click(/Review changes/);
    await type("Reason for this amendment", "Guest asked to extend");
    await click(/Save amendment/);
    const status = () => host.querySelector('[role="status"]')!.textContent!;
    expect(status()).toContain("not fully updated yet");
    expect(status()).not.toContain("Amendment saved.");
    await click(/Retry propagation/);
    expect(calls[2]).toEqual({ action: "resync" });
    expect(status()).toContain("Amendment saved.");
  });
});
