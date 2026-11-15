/**
 * GET/POST /api/admin/dev/fix-listing-presentation — the TEMPORARY plain-name
 * + tagline + stale-Mbps ("400 Mbps" B34 / "520 Mbps" Mickey) -> "500+ Mbps"
 * production content-correction route (DEC-012/DEC-034). Auth, Prisma,
 * revalidation and the audit log are mocked; no DB. A tiny in-memory fake
 * stands in for the properties table so POST's pre-write plan, write, and
 * post-write re-check all see the same evolving state, the way the real
 * route's two loadRows() calls would against a real database.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { APPLY_LISTING_PRESENTATION_CONFIRM, ALL_PROPERTIES, type PropertyContentRow } from "@/lib/listing-presentation-fixes";

const PRE: Record<string, PropertyContentRow> = {
  "cozy-1-bedroom": {
    id: 1,
    slug: "cozy-1-bedroom",
    name: "Cozy 1BR Haven | Solar Power•Netflix•Wi-Fi•5 Pax",
    tagline: "Solar Power • Netflix • Wi-Fi • 5 Pax",
    seoTitle: "Cozy 1BR Vacation Rental in Lipa City, Batangas — 400 Mbps WiFi | Haven in Lipa",
  },
  "spacious-2-bedroom": {
    id: 2,
    slug: "spacious-2-bedroom",
    name: "Spacious 2BR Getaway | Netflix•Wi-Fi•9Pax•Parking",
    tagline: "Netflix • Wi-Fi • 9 Pax • Parking",
  },
  "mickey-in-lipa--family-staycation--sleeps-7": {
    id: 3,
    slug: "mickey-in-lipa--family-staycation--sleeps-7",
    name: "Mickey in Lipa | Family Staycation | Sleeps 7",
    tagline: "Mickey-Themed • Fiber up to 520 Mbps • Sleeps 7 • Garage",
  },
  "mickey-in-lipa--family-house--sleeps-11": {
    id: 4,
    slug: "mickey-in-lipa--family-house--sleeps-11",
    name: "Mickey in Lipa | Family House | Sleeps 11",
    tagline: "Mickey-Themed • Bunk Room • Sleeps 11 • Garage",
    heroSummary: "...dedicated fiber up to 520 Mbps. From ₱4,200 per night.",
  },
  "mickey-in-lipa--full-family-house--sleeps-15": {
    id: 5,
    slug: "mickey-in-lipa--full-family-house--sleeps-15",
    name: "Mickey in Lipa | Full Family House | Sleeps 15",
    tagline: "Whole House • Two Bunk Rooms • Sleeps 15 • Garage",
    description: "...dedicated fiber up to 520 Mbps, and garage parking inside.",
  },
};

const freshPreRows = (): PropertyContentRow[] => ALL_PROPERTIES.map((p) => ({ ...PRE[p.slug] }));

const { db, session, logAction, revalidatePath } = vi.hoisted(() => ({
  db: { property: { findMany: vi.fn(), update: vi.fn() }, $transaction: vi.fn() },
  session: { current: null as null | { user: { id: string; name: string; role: string } } },
  logAction: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/auth", () => ({ auth: async () => session.current }));
vi.mock("@/lib/log", () => ({ logAction }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { GET, POST } from "@/app/api/admin/dev/fix-listing-presentation/route";

let store: Record<number, PropertyContentRow>;

beforeEach(() => {
  vi.clearAllMocks();
  session.current = { user: { id: "1", name: "Owner", role: "admin" } };
  store = Object.fromEntries(freshPreRows().map((r) => [r.id, r]));

  db.property.findMany.mockImplementation(async ({ where }: { where: { id: { in: number[] } } }) =>
    where.id.in.map((id) => store[id])
  );
  db.property.update.mockImplementation(async ({ where, data }: { where: { id: number }; data: Partial<PropertyContentRow> }) => {
    store[where.id] = { ...store[where.id], ...data };
    return store[where.id];
  });
  db.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));
});

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/admin/dev/fix-listing-presentation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );

describe("GET /api/admin/dev/fix-listing-presentation", () => {
  it("requires a session", async () => {
    session.current = null;
    expect((await GET()).status).toBe(401);
  });

  it("requires the admin role, not manager", async () => {
    session.current = { user: { id: "2", name: "Manager", role: "manager" } };
    expect((await GET()).status).toBe(403);
  });

  it("returns a dry-run plan with a planHash, writing nothing", async () => {
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.clearToExecute).toBe(true);
    expect(body.propertiesAffected).toBe(5);
    expect(body.confirmWith).toEqual({ confirm: APPLY_LISTING_PRESENTATION_CONFIRM, planHash: body.planHash });
    expect(db.property.update).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/dev/fix-listing-presentation", () => {
  it("rejects a missing/wrong confirm string, writing nothing", async () => {
    const res = await post({ confirm: "nope", planHash: "x" });
    expect(res.status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a stale/mismatched planHash, writing nothing", async () => {
    const res = await post({ confirm: APPLY_LISTING_PRESENTATION_CONFIRM, planHash: "not-the-current-hash" });
    expect(res.status).toBe(409);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("applies the plan, verifies, revalidates all 5 property pages, and logs", async () => {
    const dryRun = await (await GET()).json();
    const res = await post({ confirm: APPLY_LISTING_PRESENTATION_CONFIRM, planHash: dryRun.planHash });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.verification).toEqual({ ok: true, remainingChanges: 0 });

    expect(store[1].name).toBe("Cozy 1BR Haven");
    expect(store[2].name).toBe("Spacious 2BR Getaway");
    expect(store[5].name).toBe("Mickey in Lipa — Full Family House");
    expect(store[1].tagline).toBe("For couples and remote workers — sleeps 5");
    expect(store[1].seoTitle).toBe("Cozy 1BR Vacation Rental in Lipa City, Batangas — 500+ Mbps WiFi | Haven in Lipa");
    expect(store[3].tagline).toBe("For families with kids — up to 7");
    expect(store[4].heroSummary).not.toContain("520 Mbps");
    expect(store[5].description).not.toContain("520 Mbps");

    for (const slug of ALL_PROPERTIES.map((p) => p.slug)) {
      expect(revalidatePath).toHaveBeenCalledWith(`/properties/${slug}`);
    }
    expect(logAction).toHaveBeenCalledTimes(1);
  });

  it("is idempotent: nothing to do on a second run", async () => {
    const dryRun = await (await GET()).json();
    await post({ confirm: APPLY_LISTING_PRESENTATION_CONFIRM, planHash: dryRun.planHash });
    vi.clearAllMocks();

    const dryRun2 = await (await GET()).json();
    expect(dryRun2.nothingToDo).toBe(true);

    const res = await post({ confirm: APPLY_LISTING_PRESENTATION_CONFIRM, planHash: dryRun2.planHash });
    const body = await res.json();
    expect(body).toEqual({ success: true, nothingToDo: true, message: "Already clean — nothing written." });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("aborts with 409 and writes nothing if unexpected content is found", async () => {
    store[1] = { ...store[1], name: "Something Totally Unrelated" };
    const dryRun = await GET();
    expect(dryRun.status).toBe(409);

    const res = await post({ confirm: APPLY_LISTING_PRESENTATION_CONFIRM, planHash: "irrelevant" });
    expect(res.status).toBe(409);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
