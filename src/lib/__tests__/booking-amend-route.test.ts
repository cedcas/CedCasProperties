/**
 * POST /api/admin/bookings/[id]/amend — authorization and request handling, with the
 * session and Prisma mocked (no database; this is the part of the route CI can run).
 * The same route is exercised against real AdminUser/AdminPermission rows and a real
 * transaction in src/lib/__tests__/db/booking-amendment.dbtest.ts.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { session, db, service } = vi.hoisted(() => ({
  session: { current: null as unknown },
  db: { adminUser: { findUnique: vi.fn() } },
  service: { previewAmendment: vi.fn(), commitAmendment: vi.fn(), resyncAmendedBooking: vi.fn() },
}));

vi.mock("@/lib/auth", () => ({ auth: async () => session.current }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/log", () => ({ logAction: vi.fn(), getIpFromRequest: () => "203.0.113.9" }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/booking-amendment", async () => {
  class AmendmentError extends Error {
    constructor(readonly status: number, message: string, readonly code: string, readonly details = {}) {
      super(message);
    }
  }
  return { AmendmentError, ...service };
});

import { POST } from "@/app/api/admin/bookings/[id]/amend/route";
import { AmendmentError } from "@/lib/booking-amendment";

const call = (body: unknown, id = "130") =>
  POST(
    new Request("http://localhost/api", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }) as unknown as NextRequest,
    { params: Promise.resolve({ id }) }
  );

const signIn = (user: { id: number; role: string; permissions?: Record<string, boolean> | null } | null, tokenRole = user?.role) => {
  session.current = user ? { user: { id: String(user.id), name: "Staff", role: tokenRole } } : null;
  db.adminUser.findUnique.mockResolvedValue(user ? { id: user.id, name: "Staff", role: user.role, permissions: user.permissions ?? null } : null);
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  service.previewAmendment.mockResolvedValue({ bookingId: 130 });
  service.commitAmendment.mockResolvedValue({ outcome: "applied" });
});

describe("authorization", () => {
  const COMMIT = { action: "commit", changes: { guests: 1 }, reason: "one fewer guest", expectedUpdatedAt: "t" };

  it("401 with no session — for every action", async () => {
    signIn(null);
    for (const action of ["preview", "commit", "resync"]) expect((await call({ ...COMMIT, action })).status).toBe(401);
    expect(service.commitAmendment).not.toHaveBeenCalled();
  });

  it("403 for a logged-in manager without the bookings permission", async () => {
    for (const permissions of [null, { bookings: false, messages: true, properties: true }]) {
      signIn({ id: 5, role: "manager", permissions });
      for (const action of ["preview", "commit", "resync"]) expect((await call({ ...COMMIT, action })).status).toBe(403);
    }
    expect(service.previewAmendment).not.toHaveBeenCalled();
    expect(service.commitAmendment).not.toHaveBeenCalled();
    expect(service.resyncAmendedBooking).not.toHaveBeenCalled();
  });

  it("trusts the database role, not the role in the session token", async () => {
    signIn({ id: 5, role: "manager", permissions: { bookings: false } }, "admin");
    expect((await call(COMMIT)).status).toBe(403);
    signIn(null);
    session.current = { user: { id: "77", name: "Deleted", role: "admin" } };
    expect((await call(COMMIT)).status).toBe(401);
  });

  it("allows an admin and a manager with bookings, and passes the DB identity as the actor", async () => {
    signIn({ id: 1, role: "admin" });
    expect((await call(COMMIT)).status).toBe(200);
    signIn({ id: 5, role: "manager", permissions: { bookings: true } });
    expect((await call(COMMIT)).status).toBe(200);
    expect(service.commitAmendment).toHaveBeenLastCalledWith(
      expect.objectContaining({ bookingId: 130, actor: { id: 5, name: "Staff", role: "manager" }, ipAddress: "203.0.113.9", reason: "one fewer guest", expectedUpdatedAt: "t" })
    );
  });
});

describe("request handling", () => {
  beforeEach(() => signIn({ id: 1, role: "admin" }));

  it("rejects malformed ids, bodies and actions", async () => {
    expect((await call({ action: "preview" }, "abc")).status).toBe(404);
    expect((await call({ action: "preview" }, "0")).status).toBe(404);
    expect((await call("{not json")).status).toBe(400);
    expect((await call([1])).status).toBe(400);
    expect((await call({ action: "delete" })).status).toBe(400);
  });

  it("returns the service's status, code and details for a rejected amendment", async () => {
    service.commitAmendment.mockRejectedValue(new AmendmentError(409, "Not available.", "conflict", { conflicts: [{ label: "Booking #9", range: "r", kind: "booking" }] }));
    const res = await call({ action: "commit" });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Not available.", code: "conflict", conflicts: [{ label: "Booking #9", range: "r", kind: "booking" }] });
  });

  it("an unexpected failure is a 500 that tells the admin to re-check — never a success", async () => {
    service.commitAmendment.mockRejectedValue(new Error("connection lost"));
    const res = await call({ action: "commit" });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe("failed");
    expect(body.error).toContain("Reload the booking");
    expect(body.error).not.toContain("connection lost");
  });
});
