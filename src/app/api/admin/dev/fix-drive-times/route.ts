import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/log";
import {
  EXPECTED_PROPERTIES,
  UnexpectedContentError,
  detectStaleFields,
  type ContentFieldName,
} from "@/lib/property-content-fixes";
import {
  checkApplyRequest,
  planDriveTimeFixes,
  DRIVE_TIME_CONFIRM,
  type DriveTimePlan,
  type PropertyContentRow,
} from "@/lib/drive-time-fixes";

/**
 * TEMPORARY one-off admin route (DEC-012) — corrects the superseded SM City Lipa /
 * Casa Marikit drive times in the 5 properties' content fields on production, which
 * can't be reached from outside Vercel. Owner-confirmed 2026-09-27: SM City Lipa about
 * 20 minutes / Casa Marikit about 30 minutes by car. DELETE THIS FILE once the run is
 * confirmed. Do not generalize it.
 *
 * All planning and safety checks live in the pure, unit-tested src/lib/drive-time-fixes.ts
 * (the same code scripts/fix-property-content.ts runs as its second pass): exact
 * {id, slug} assertions for the 5 properties, targeted exact-substring replacements only
 * (never a whole-field overwrite), and any residual stale drive-time phrase aborts.
 *
 * GET  → dry run (read-only): per-property/per-field excerpts, full proposed values,
 *        change count, planHash. Never writes.
 * POST → body {"confirm":"APPLY-DRIVE-TIMES","planHash":"<from GET>"}. Recomputes the
 *        plan; 409 if the hash differs (data changed since review) or any assertion
 *        fails; one $transaction; re-scans and returns the verification. Nothing to do
 *        → no write (idempotent).
 *
 * Owner, logged into /admin in the same browser, devtools console:
 *   await (await fetch("/api/admin/dev/fix-drive-times")).json()
 *   await (await fetch("/api/admin/dev/fix-drive-times", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: "APPLY-DRIVE-TIMES", planHash: "<planHash from GET>" }) })).json()
 */

export const dynamic = "force-dynamic";

const SELECT = {
  id: true,
  slug: true,
  description: true,
  seoTitle: true,
  seoDescription: true,
  tagline: true,
  heroSummary: true,
  bestForSegments: true,
  amenityDetails: true,
  neighborhoodPlaces: true,
  propertyFaqs: true,
  imageAlts: true,
} as const;

async function loadRows(): Promise<PropertyContentRow[]> {
  return prisma.property.findMany({
    where: { id: { in: EXPECTED_PROPERTIES.map((p) => p.id) } },
    select: SELECT,
  });
}

// The Maculot/Mbps/parking pass is not part of this route. It was verified clean on
// 2026-09-07; if it isn't any more, stop and use the CLI script instead of half-fixing.
function assertFirstPassClean(rows: PropertyContentRow[]): void {
  const dirty = rows
    .map((r) => ({ slug: r.slug, fields: detectStaleFields(r as Partial<Record<ContentFieldName, string>>) }))
    .filter((r) => r.fields.length > 0);
  if (dirty.length > 0) {
    throw new UnexpectedContentError(
      `Maculot/Mbps/parking content found (${dirty.map((d) => `${d.slug}: ${d.fields.join(", ")}`).join("; ")}) — out of scope for this route.`
    );
  }
}

async function buildPlan(): Promise<{ plan: DriveTimePlan } | { error: string }> {
  try {
    const rows = await loadRows();
    assertFirstPassClean(rows);
    return { plan: planDriveTimeFixes(rows) };
  } catch (e) {
    if (e instanceof UnexpectedContentError) return { error: e.message };
    throw e;
  }
}

function describePlan(plan: DriveTimePlan) {
  return {
    planHash: plan.planHash,
    totalFieldChanges: plan.changes.length,
    propertiesAffected: plan.updates.length,
    changes: plan.changes.map((c) => ({
      id: c.id,
      slug: c.slug,
      field: c.field,
      replacements: c.fragments,
      excerpt: c.excerpt,
      proposedValue: c.after,
    })),
  };
}

async function requireAdmin() {
  const session = await auth();
  if (!session) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if ((session.user.role ?? "admin") !== "admin") {
    return { response: NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 }) };
  }
  return { session };
}

export async function GET() {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;

  const result = await buildPlan();
  if ("error" in result) {
    return NextResponse.json({ dryRun: true, clearToExecute: false, error: result.error }, { status: 409 });
  }
  return NextResponse.json({
    dryRun: true,
    clearToExecute: result.plan.changes.length > 0,
    nothingToDo: result.plan.changes.length === 0,
    confirmWith: { confirm: DRIVE_TIME_CONFIRM, planHash: result.plan.planHash },
    ...describePlan(result.plan),
  });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;
  const { session } = gate;

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const result = await buildPlan();
  if ("error" in result) {
    return NextResponse.json({ error: "Aborted — unexpected content, nothing written", detail: result.error }, { status: 409 });
  }
  const { plan } = result;

  const check = checkApplyRequest(body, plan.planHash);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  if (plan.updates.length === 0) {
    return NextResponse.json({ success: true, nothingToDo: true, message: "Already clean — nothing written." });
  }

  await prisma.$transaction(
    plan.updates.map((u) => prisma.property.update({ where: { id: u.id }, data: u.data }))
  );

  // Re-scan after the write: must plan zero changes and raise no unexpected content.
  let verification: { ok: boolean; remainingChanges?: number; error?: string };
  const after = await buildPlan();
  if ("error" in after) verification = { ok: false, error: after.error };
  else verification = { ok: after.plan.changes.length === 0, remainingChanges: after.plan.changes.length };

  await logAction({
    actor: session.user.name ?? "Admin",
    actorRole: "admin",
    actorId: parseInt(session.user.id),
    action: `Drive-time content fix: ${plan.changes.length} field(s) on ${plan.updates.length} properties (SM Lipa ~20 min, Casa Marikit ~30 min)`,
    module: "properties",
    target: plan.updates.map((u) => `property-${u.id}`).join(","),
    metadata: {
      planHash: plan.planHash,
      verification,
      changes: plan.changes.map((c) => ({ id: c.id, slug: c.slug, field: c.field, replacements: c.fragments })),
    },
  });

  return NextResponse.json(
    {
      success: verification.ok,
      planHash: plan.planHash,
      written: plan.changes.map((c) => ({ id: c.id, slug: c.slug, field: c.field, replacements: c.fragments })),
      verification,
    },
    { status: verification.ok ? 200 : 500 }
  );
}
