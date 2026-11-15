import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/log";
import { UnexpectedContentError } from "@/lib/property-content-fixes";
import {
  ALL_PROPERTIES,
  APPLY_LISTING_PRESENTATION_CONFIRM,
  checkApplyRequest,
  planListingPresentationFixes,
  type PresentationPlan,
  type PropertyContentRow,
} from "@/lib/listing-presentation-fixes";

/**
 * TEMPORARY one-off admin route (DEC-012/DEC-034) — corrects two production
 * content issues that have no admin UI (DEC-015): (1) `Property.name` is
 * still the Airbnb-style keyword-stuffed string for all 5 listings; (2) the
 * 3 Mickey/B38 listings' speed-bearing fields still say "up to 520 Mbps",
 * superseded by "500+ Mbps" for marketing-language consistency with B34
 * (DEC-034 — not a new speed test, B38 is not claimed slower). Does not touch
 * B34's Mbps wording — that correction already ran via the now-removed
 * `/api/admin/dev/fix-b34-speed` (DEC-032 addenda). DELETE THIS FILE once the
 * run is confirmed. Do not generalize it.
 *
 * All planning and safety checks live in the pure, unit-tested
 * src/lib/listing-presentation-fixes.ts: exact {id, slug} assertions for all
 * 5 properties, a prefix-preserving name rewrite with its own "doesn't look
 * like the expected string" abort, targeted exact-substring Mbps replacements
 * (never a whole-field overwrite) for Mickey only, and any residual stale
 * "520 Mbps" aborts the whole run.
 *
 * GET  → dry run (read-only): per-property/per-field excerpts, full proposed
 *        values, change count, planHash. Never writes.
 * POST → body {"confirm":"APPLY-LISTING-PRESENTATION","planHash":"<from GET>"}.
 *        Recomputes the plan; 409 if the hash differs (data changed since
 *        review) or any assertion fails; one $transaction; re-scans and
 *        returns the verification; revalidates all 5 property pages.
 *        Nothing to do → no write (idempotent).
 *
 * Owner, logged into /admin in the same browser, devtools console:
 *   await (await fetch("/api/admin/dev/fix-listing-presentation")).json()
 *   await (await fetch("/api/admin/dev/fix-listing-presentation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: "APPLY-LISTING-PRESENTATION", planHash: "<planHash from GET>" }) })).json()
 *
 * Note (HIL_PROJECT_STATUS.md): the public site already shows the plain
 * canonical name from src/lib/property-display.ts without this write — this
 * route only corrects the *stored* value admin screens display, plus the
 * Mickey Mbps text. On dev.haveninlipa.com it also fixes the [DEVDB]-prefixed
 * titles there, if Cedric wants that too (the prefix is preserved).
 */

export const dynamic = "force-dynamic";

const SELECT = {
  id: true,
  slug: true,
  name: true,
  tagline: true,
  seoDescription: true,
  heroSummary: true,
  description: true,
  amenityDetails: true,
  propertyFaqs: true,
} as const;

async function loadRows(): Promise<PropertyContentRow[]> {
  return prisma.property.findMany({
    where: { id: { in: ALL_PROPERTIES.map((p) => p.id) } },
    select: SELECT,
  });
}

async function buildPlan(): Promise<{ plan: PresentationPlan } | { error: string }> {
  try {
    const rows = await loadRows();
    return { plan: planListingPresentationFixes(rows) };
  } catch (e) {
    if (e instanceof UnexpectedContentError) return { error: e.message };
    throw e;
  }
}

function describePlan(plan: PresentationPlan) {
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
// either optional — same precedent as the fix-b34-speed/fix-drive-times routes.
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
    confirmWith: { confirm: APPLY_LISTING_PRESENTATION_CONFIRM, planHash: result.plan.planHash },
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
  // (no page-level cache), so they read the new value on their very next
  // request regardless. revalidatePath is still called for all 5, in case
  // that ever changes. src/lib/listings.ts's `unstable_cache` behind the
  // homepage grid/`/properties`/sitemap/feed is left alone — same trade every
  // other admin property edit already makes (see the fix-b34-speed route's
  // comment on this exact point; this installed Next.js version's
  // revalidateTag needs a second argument that doesn't correspond to
  // anything that unstable_cache call declares).
  for (const slug of ALL_PROPERTIES.map((p) => p.slug)) revalidatePath(`/properties/${slug}`);

  await logAction({
    actor: session.user.name ?? "Admin",
    actorRole: "admin",
    actorId: parseInt(session.user.id),
    action: `Listing presentation content fix: ${plan.changes.length} field(s) on ${plan.updates.length} properties (plain names + Mickey 520->500+ Mbps)`,
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
