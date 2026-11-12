/**
 * GET/POST /api/admin/dev/fix-b34-speed — the TEMPORARY B34 "340 Mbps" ->
 * "500+ Mbps" production content-correction route (DEC-012/DEC-032). Auth,
 * Prisma, revalidation and the audit log are mocked; no DB. Uses a tiny
 * in-memory fake so POST's pre-write plan, write, and post-write re-check all
 * see the same evolving state, the way the real route's two loadRows() calls
 * would against a real database.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { APPLY_B34_SPEED_CONFIRM } from "@/lib/b34-speed-fixes";

type Fields = {
  seoTitle: string;
  seoDescription: string;
  heroSummary: string;
  description: string;
  bestForSegments: string;
  amenityDetails: string;
  propertyFaqs: string;
};
type Row = { id: number; slug: string } & Fields;

const FX = JSON.parse(
  readFileSync(path.join(__dirname, "fixtures/b34-speed-pre-post-105.json"), "utf8")
) as { pre: Record<string, Fields>; post: Record<string, Partial<Fields>> };

const SLUGS: Record<number, string> = { 1: "cozy-1-bedroom", 2: "spacious-2-bedroom" };
const freshPreRows = (): Row[] => [
  { id: 1, slug: "cozy-1-bedroom", ...FX.pre["cozy-1-bedroom"] },
  { id: 2, slug: "spacious-2-bedroom", ...FX.pre["spacious-2-bedroom"] },
];

const { db, session, logAction, revalidatePath } = vi.hoisted(() => ({
  db: {
    property: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  session: { current: null as null | { user: { id: string; name: string; role: string } } },
  logAction: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/auth", () => ({ auth: async () => session.current }));
vi.mock("@/lib/log", () => ({ logAction }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { GET, POST } from "@/app/api/admin/dev/fix-b34-speed/route";

// In-memory store, keyed by id, standing in for the properties table. $transaction
// applies each update synchronously against it, so a re-run of findMany (the
// post-write verification) sees the new values — exactly like a real DB would.
let store: Record<number, Row>;

beforeEach(() => {
  vi.clearAllMocks();
  session.current = { user: { id: "1", name: "Owner", role: "admin" } };
  store = Object.fromEntries(freshPreRows().map((r) => [r.id, r]));

  db.property.findMany.mockImplementation(async ({ where }: { where: { id: { in: number[] } } }) =>
    where.id.in.map((id) => store[id])
  );
  db.property.update.mockImplementation(async ({ where, data }: { where: { id: number }; data: Partial<Fields> }) => {
    store[where.id] = { ...store[where.id], ...data };
    return store[where.id];
  });
  db.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));
});

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/admin/dev/fix-b34-speed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );

describe("GET /api/admin/dev/fix-b34-speed", () => {
  it("requires a session", async () => {
    session.current = null;
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("requires the admin role, not manager", async () => {
    session.current = { user: { id: "2", name: "Manager", role: "manager" } };
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns a dry-run plan with excerpts and a planHash, writing nothing", async () => {
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.clearToExecute).toBe(true);
    expect(body.totalFieldChanges).toBe(10);
    expect(body.propertiesAffected).toBe(2);
    expect(body.confirmWith).toEqual({ confirm: APPLY_B34_SPEED_CONFIRM, planHash: body.planHash });
    expect(body.changes.every((c: { excerpt: { old: string } }) => c.excerpt.old.includes("340"))).toBe(true);
    expect(db.property.update).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("reports nothing to do once the content is already fixed", async () => {
    store = Object.fromEntries(
      Object.entries(store).map(([id, row]) => [id, { ...row, ...FX.post[SLUGS[Number(id)]] } as Row])
    );
    const res = await GET();
    const body = await res.json();
    expect(body.nothingToDo).toBe(true);
    expect(body.clearToExecute).toBe(false);
    expect(body.totalFieldChanges).toBe(0);
  });
});

describe("POST /api/admin/dev/fix-b34-speed", () => {
  it("requires a session", async () => {
    session.current = null;
    const res = await post({ confirm: APPLY_B34_SPEED_CONFIRM, planHash: "x" });
    expect(res.status).toBe(401);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("requires the admin role, not manager", async () => {
    session.current = { user: { id: "2", name: "Manager", role: "manager" } };
    const res = await post({ confirm: APPLY_B34_SPEED_CONFIRM, planHash: "x" });
    expect(res.status).toBe(403);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a missing/wrong confirm string, writing nothing", async () => {
    const res = await post({ confirm: "nope", planHash: "x" });
    expect(res.status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a stale/mismatched planHash, writing nothing", async () => {
    const res = await post({ confirm: APPLY_B34_SPEED_CONFIRM, planHash: "not-the-current-hash" });
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error).toMatch(/planHash mismatch/);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("applies the plan, verifies, revalidates, and logs, given the matching planHash", async () => {
    const dryRun = await (await GET()).json();
    const res = await post({ confirm: APPLY_B34_SPEED_CONFIRM, planHash: dryRun.planHash });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.written).toHaveLength(10);
    expect(body.verification).toEqual({ ok: true, remainingChanges: 0 });

    expect(store[1].description).toBe(FX.post["cozy-1-bedroom"].description);
    expect(store[1].seoTitle).toContain("500+ Mbps");
    expect(store[2].propertyFaqs).toContain("500+ Mbps");
    expect(store[1].description).not.toContain("340 Mbps");
    expect(store[2].description).not.toContain("340 Mbps");

    expect(revalidatePath).toHaveBeenCalledWith("/properties/cozy-1-bedroom");
    expect(revalidatePath).toHaveBeenCalledWith("/properties/spacious-2-bedroom");

    expect(logAction).toHaveBeenCalledTimes(1);
    expect(logAction.mock.calls[0][0]).toMatchObject({
      actorRole: "admin",
      module: "properties",
      target: "property-1,property-2",
    });
  });

  it("is idempotent: nothing to do on a second run, and does not write or revalidate", async () => {
    const dryRun = await (await GET()).json();
    await post({ confirm: APPLY_B34_SPEED_CONFIRM, planHash: dryRun.planHash });
    vi.clearAllMocks();

    const dryRun2 = await (await GET()).json();
    expect(dryRun2.nothingToDo).toBe(true);

    const res = await post({ confirm: APPLY_B34_SPEED_CONFIRM, planHash: dryRun2.planHash });
    const body = await res.json();
    expect(body).toEqual({ success: true, nothingToDo: true, message: "Already clean — nothing written." });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(logAction).not.toHaveBeenCalled();
  });

  it("aborts with 409 and writes nothing if unexpected content is found", async () => {
    store[1] = { ...store[1], seoDescription: `${store[1].seoDescription} Also 340 Mbps in the garage.` };
    const dryRun = await GET();
    expect(dryRun.status).toBe(409);

    const res = await post({ confirm: APPLY_B34_SPEED_CONFIRM, planHash: "irrelevant" });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/unexpected content/);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
