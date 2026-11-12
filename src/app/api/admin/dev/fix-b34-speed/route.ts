import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/log";
import { UnexpectedContentError } from "@/lib/property-content-fixes";
import {
  APPLY_B34_SPEED_CONFIRM,
  B34_PROPERTIES,
  checkApplyRequest,
  planB34SpeedFixes,
  type PropertyContentRow,
  type SpeedPlan,
} from "@/lib/b34-speed-fixes";

/**
 * TEMPORARY one-off admin route (DEC-012) — corrects the superseded "up to 340
 * Mbps" internet-speed wording in the 2 B34 properties' content fields on
 * production, which can't be reached from outside Vercel. Owner-approved
 * 2026-11-12 (Cedric): B34's fiber WiFi is now 500+ Mbps (DEC-032). Does not
 * touch B38/Mickey (520 Mbps, unaffected). DELETE THIS FILE once the run is
 * confirmed. Do not generalize it.
 *
 * All planning and safety checks live in the pure, unit-tested
 * src/lib/b34-speed-fixes.ts: exact {id, slug} assertions for the 2 B34
 * properties, targeted exact-substring replacements only (never a whole-field
 * overwrite), and any residual stale "340 Mbps" aborts. That module is
 * deliberately independent of src/lib/property-content-fixes.ts's
 * STALE_PATTERNS (see the DEC-032 regex-collision note there and in the lib) —
 * this route does not call detectStaleFields either.
 *
 * GET  → dry run (read-only): per-property/per-field excerpts, full proposed
 *        values, change count, planHash. Never writes.
 * POST → body {"confirm":"APPLY-B34-SPEED","planHash":"<from GET>"}. Recomputes
 *        the plan; 409 if the hash differs (data changed since review) or any
 *        assertion fails; one $transaction; re-scans and returns the
 *        verification; revalidates the public listing cache. Nothing to do →
 *        no write (idempotent).
 *
 * Owner, logged into /admin in the same browser, devtools console:
 *   await (await fetch("/api/admin/dev/fix-b34-speed")).json()
 *   await (await fetch("/api/admin/dev/fix-b34-speed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: "APPLY-B34-SPEED", planHash: "<planHash from GET>" }) })).json()
 */

export const dynamic = "force-dynamic";

const SELECT = {
  id: true,
  slug: true,
  seoTitle: true,
  seoDescription: true,
  heroSummary: true,
  description: true,
  bestForSegments: true,
  amenityDetails: true,
  propertyFaqs: true,
} as const;

async function loadRows(): Promise<PropertyContentRow[]> {
  return prisma.property.findMany({
    where: { id: { in: B34_PROPERTIES.map((p) => p.id) } },
    select: SELECT,
  });
}

async function buildPlan(): Promise<{ plan: SpeedPlan } | { error: string }> {
  try {
    const rows = await loadRows();
    return { plan: planB34SpeedFixes(rows) };
  } catch (e) {
    if (e instanceof UnexpectedContentError) return { error: e.message };
    throw e;
  }
}

function describePlan(plan: SpeedPlan) {
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

// Both branches declare both keys (one of them `null`) rather than making
// either optional — narrowing on an optional-vs-required key via `"x" in obj`
// does not reliably exclude the other branch in this TypeScript version, which
// left `gate.response` typed as `NextResponse | undefined` below. A plain
// truthiness check on a required field does not have that problem.
type AdminGate = { response: NextResponse; session: null } | { response: null; session: Session };

async function requireAdmin(): Promise<AdminGate> {
  const session = await auth();
  if (!session) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  if ((session.user.role ?? "admin") !== "admin") {
    return { response: NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 }), session: null };
  }
  return { response: null, session };
}

export async function GET() {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  const result = await buildPlan();
  if ("error" in result) {
    return NextResponse.json({ dryRun: true, clearToExecute: false, error: result.error }, { status: 409 });
  }
  return NextResponse.json({
    dryRun: true,
    clearToExecute: result.plan.changes.length > 0,
    nothingToDo: result.plan.changes.length === 0,
    confirmWith: { confirm: APPLY_B34_SPEED_CONFIRM, planHash: result.plan.planHash },
    ...describePlan(result.plan),
  });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;
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

  // The property detail pages (/properties/[slug]) are already `force-dynamic`
  // (no page-level cache — see src/app/properties/[slug]/page.tsx), so they
  // read the new value on their very next request regardless. revalidatePath
  // is still called for both, in case that ever changes.
  //
  // What DOES cache is src/lib/listings.ts's `unstable_cache` (tag
  // "public-listings", up to 1 hour) behind the homepage grid, /properties,
  // the sitemap, and the JSON feed. This installed Next.js version's
  // `revalidateTag` requires a second "profile" argument tied to the newer
  // Cache Components model, which doesn't correspond to anything this
  // `unstable_cache` call declares — calling it with a guessed profile risked
  // doing the wrong thing silently. Left alone: those surfaces catch up to the
  // correction within the hour, the same trade every other admin property
  // edit already makes today (no admin property route revalidates that cache
  // either — see the comment in listings.ts).
  for (const slug of B34_PROPERTIES.map((p) => p.slug)) revalidatePath(`/properties/${slug}`);

  await logAction({
    actor: session.user.name ?? "Admin",
    actorRole: "admin",
    actorId: parseInt(session.user.id),
    action: `B34 internet-speed content fix: ${plan.changes.length} field(s) on ${plan.updates.length} properties (up to 340 Mbps -> 500+ Mbps)`,
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
