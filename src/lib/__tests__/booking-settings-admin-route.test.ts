/**
 * PUT /api/admin/properties/[id] — the Booking settings fields (guest advance notice).
 * Auth, Prisma and the audit log are mocked; no DB.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { db, session, logAction } = vi.hoisted(() => ({
  db: {
    property: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    inventoryGroupMember: { findUnique: vi.fn() },
  },
  session: { current: null as null | { user: { id: string; name: string; role: string } } },
  logAction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/auth", () => ({ auth: async () => session.current }));
vi.mock("@/lib/log", () => ({ logAction }));

import { PUT } from "@/app/api/admin/properties/[id]/route";

const put = (body: unknown, id = "4") =>
  PUT(
    new Request("http://localhost/api/admin/properties/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) }
  );

const row = (id: number, name: string, policy = { advanceNoticeDays: 0, sameDayCutoffMinutes: null as number | null }) => ({
  id,
  name,
  ...policy,
});
const ELEVEN_THIRTY_PM = 23 * 60 + 30;

beforeEach(() => {
  vi.clearAllMocks();
  session.current = { user: { id: "1", name: "Owner", role: "admin" } };
  db.property.findUnique.mockResolvedValue(row(4, "Mickey Sleeps 11"));
  db.property.findMany.mockResolvedValue([row(3, "Mickey Sleeps 7"), row(5, "Mickey Sleeps 4")]);
  db.property.update.mockImplementation(async ({ data }) => ({ id: 4, ...data }));
  db.property.updateMany.mockResolvedValue({ count: 2 });
  db.inventoryGroupMember.findUnique.mockResolvedValue({ inventoryGroupId: 9 });
});

describe("PUT /api/admin/properties/[id] — booking settings", () => {
  it("requires a session", async () => {
    session.current = null;
    const res = await put({ advanceNoticeDays: 0, sameDayCutoffMinutes: ELEVEN_THIRTY_PM });
    expect(res.status).toBe(401);
    expect(db.property.update).not.toHaveBeenCalled();
  });

  it("saves this listing only, and logs the change", async () => {
    const res = await put({ advanceNoticeDays: "0", sameDayCutoffMinutes: String(ELEVEN_THIRTY_PM) });
    expect(res.status).toBe(200);
    expect(db.property.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { advanceNoticeDays: 0, sameDayCutoffMinutes: ELEVEN_THIRTY_PM },
    });
    expect(db.property.updateMany).not.toHaveBeenCalled();
    expect(db.inventoryGroupMember.findUnique).not.toHaveBeenCalled();
    expect(logAction).toHaveBeenCalledTimes(1);
    expect(logAction.mock.calls[0][0]).toMatchObject({
      module: "properties",
      target: "property-4",
      action: 'Changed booking settings for "Mickey Sleeps 11" from same day, no cutoff to same day until 11:30 PM',
    });
  });

  it("copies to the other listings in the house only when asked, logging each one changed", async () => {
    db.property.findMany.mockResolvedValue([
      row(3, "Mickey Sleeps 7"),
      row(5, "Mickey Sleeps 4", { advanceNoticeDays: 0, sameDayCutoffMinutes: ELEVEN_THIRTY_PM }), // already there
    ]);
    const res = await put({ advanceNoticeDays: 0, sameDayCutoffMinutes: ELEVEN_THIRTY_PM, applyBookingPolicyToHouse: true });
    expect(res.status).toBe(200);
    expect(db.property.findMany.mock.calls[0][0].where).toEqual({
      id: { not: 4 },
      inventoryMembership: { inventoryGroupId: 9 },
    });
    expect(db.property.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [3, 5] } },
      data: { advanceNoticeDays: 0, sameDayCutoffMinutes: ELEVEN_THIRTY_PM },
    });
    expect(logAction.mock.calls.map((c) => c[0].target)).toEqual(["property-4", "property-3"]);
  });

  it("copies nothing for a listing that is not in a house", async () => {
    db.inventoryGroupMember.findUnique.mockResolvedValue(null);
    await put({ advanceNoticeDays: 1, applyBookingPolicyToHouse: true });
    expect(db.property.findMany).not.toHaveBeenCalled();
    expect(db.property.updateMany).not.toHaveBeenCalled();
  });

  it("does not log when nothing changed", async () => {
    await put({ advanceNoticeDays: 0, sameDayCutoffMinutes: "" });
    expect(logAction).not.toHaveBeenCalled();
  });

  it("rejects a value that is not an offered choice, writing nothing", async () => {
    const res = await put({ advanceNoticeDays: 5 });
    expect(res.status).toBe(400);
    expect(db.property.update).not.toHaveBeenCalled();
  });

  it("leaves booking settings alone when another page saves other fields", async () => {
    await put({ pricePerNight: "2500" });
    expect(db.property.update.mock.calls[0][0].data).toEqual({ pricePerNight: 2500 });
    expect(logAction).not.toHaveBeenCalled();
  });

  describe("Instant Booking mode", () => {
    beforeEach(() => db.property.findUnique.mockResolvedValue({ ...row(4, "Mickey Sleeps 11"), instantBookingMode: "on" }));

    it("switches this listing to approval-required and logs it, without touching the house", async () => {
      const res = await put({ instantBookingMode: "off" });
      expect(res.status).toBe(200);
      expect(db.property.update.mock.calls[0][0].data).toEqual({ instantBookingMode: "off" });
      expect(db.property.updateMany).not.toHaveBeenCalled();
      expect(logAction).toHaveBeenCalledTimes(1);
      expect(logAction.mock.calls[0][0]).toMatchObject({
        target: "property-4",
        action: 'Changed "Mickey Sleeps 11" from Instant Booking on to Instant Booking off (approval required)',
        metadata: { before: "on", after: "off" },
      });
    });

    it("an unchanged value is not a change: nothing written for it, nothing logged", async () => {
      await put({ instantBookingMode: "on", name: "Mickey Sleeps 11" });
      expect(db.property.update.mock.calls[0][0].data).toEqual({ name: "Mickey Sleeps 11" });
      expect(logAction).not.toHaveBeenCalled();
    });

    it.each(["auto", "sometimes", ""])("rejects %j — auto is not offered yet", async (mode) => {
      const res = await put({ instantBookingMode: mode });
      expect(res.status).toBe(400);
      expect(db.property.update).not.toHaveBeenCalled();
    });
  });
});
