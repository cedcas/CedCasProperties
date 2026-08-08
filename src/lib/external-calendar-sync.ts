/**
 * External calendar sync — fetch, parse and persist each property's imported iCal feed.
 *
 * Previously the feed at `Property.airbnbIcsUrl` was fetched and parsed live on every
 * availability check and then discarded. That left no stable record of an imported
 * reservation, so there was nothing to match on the next run, nothing to update when its
 * dates moved, and no way to tell "this event is gone" from "the fetch failed". Shared
 * inventory propagation needs all three.
 *
 * ── The removal safety rail ────────────────────────────────────────────────
 * The dangerous operation here is deciding an event has DISAPPEARED, because that
 * unblocks dates. A fetch is only allowed to drive removals when it unambiguously
 * succeeded — HTTP 2xx AND a body that actually looks like a calendar. On any timeout,
 * non-2xx, or garbage payload we record the failure and leave the last known-good state
 * completely intact.
 *
 * This is a deliberate improvement on the old behaviour, where a renamed or broken feed
 * silently dropped every Airbnb block and the site quietly resumed accepting bookings on
 * occupied dates with no warning anywhere.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toUtcMidnight, utcDateKey, todayUtc } from "@/lib/dates";
import { parseIcsEvents, looksLikeVCalendar, type ParsedIcsEvent } from "@/lib/ical";
import { syntheticExternalUid } from "@/lib/calendar-uids";
import { reconcileExternalEventDerivedBlocks } from "@/lib/inventory-groups";
import { logAction } from "@/lib/log";

const FETCH_TIMEOUT_MS = 5_000;
const USER_AGENT = "HavenInLipa/1.0";

export type SyncStatus = "ok" | "fetch_failed" | "parse_failed" | "not_configured";

export interface PropertySyncResult {
  propertyId: number;
  propertyName: string;
  status: SyncStatus;
  error?: string;
  events: number;
  created: number;
  updated: number;
  removed: number;
  blocksCreated: number;
  blocksUpdated: number;
  blocksCancelled: number;
  /** True when the run was skipped because another run had just claimed this feed. */
  skipped?: boolean;
}

export interface SyncRunSummary {
  properties: number;
  events: number;
  created: number;
  updated: number;
  removed: number;
  blocks: number;
  failures: { propertyId: number; propertyName: string; status: SyncStatus; error?: string }[];
  results: PropertySyncResult[];
}

// ── Pure planning layer ────────────────────────────────────────────────────

export interface ExistingExternalEvent {
  id: number;
  externalUid: string;
  startDate: Date;
  endDate: Date;
  status: string; // active | removed
}

export interface NormalizedFeedEvent {
  externalUid: string;
  summary: string | null;
  startDate: Date;
  endDate: Date;
}

export interface ExternalSyncPlan {
  /** Events to create or revive/re-date, keyed by externalUid. */
  upserts: NormalizedFeedEvent[];
  /** Ids whose dates changed — these need their sibling blocks re-derived. */
  changedIds: number[];
  /** Ids present in the DB as active but absent from a SUCCESSFUL fetch. */
  removedIds: number[];
  /** Ids that were previously removed and have now reappeared in the feed. */
  revivedIds: number[];
}

/**
 * Give every feed event a stable identity, de-duplicating within a single feed.
 *
 * Events without a UID fall back to a date-derived synthetic id, so they keep the same
 * identity across runs instead of churning. If a feed emits the same UID twice, the first
 * occurrence wins — duplicating it would violate the `[propertyId, externalUid]` unique
 * constraint and abort the whole sync.
 */
export function normalizeFeedEvents(parsed: ParsedIcsEvent[]): NormalizedFeedEvent[] {
  const byUid = new Map<string, NormalizedFeedEvent>();

  for (const event of parsed) {
    const startDate = toUtcMidnight(event.start);
    const endDate = toUtcMidnight(event.end);
    if (!(endDate > startDate)) continue;

    const externalUid = (
      event.uid ?? syntheticExternalUid(utcDateKey(startDate), utcDateKey(endDate))
    ).slice(0, 191);
    if (byUid.has(externalUid)) continue;

    byUid.set(externalUid, { externalUid, summary: event.summary, startDate, endDate });
  }

  return [...byUid.values()];
}

/**
 * Diff a freshly-fetched feed against what is already persisted. Pure — no DB, no clock.
 *
 * Only ever called with the output of a verified-successful fetch, or with an empty feed
 * when the property has no iCal URL configured. A FAILED fetch never reaches here, which
 * is what makes `removedIds` trustworthy.
 *
 * `retractFrom` bounds retraction to current-and-future events (`endDate > retractFrom`).
 * Two reasons it matters:
 *
 *  1. **History is never rewritten.** Removing or replacing a feed must not touch dates
 *     that have already happened — a completed stay is a fact, not something the feed can
 *     retract. Past records are inert anyway: availability starts at today, the iCal
 *     export is bounded to today, and booking creation rejects past dates.
 *  2. **Airbnb feeds do not carry past reservations.** Without this bound, the first sync
 *     after any stay completes would mark that event "removed", cancel its derived blocks
 *     and write a misleading audit line — on the normal happy path, for every stay.
 *
 * Omit it only where unbounded retraction is genuinely wanted; callers in this module
 * always pass today.
 */
export function planExternalEventSync(
  feedEvents: NormalizedFeedEvent[],
  existing: ExistingExternalEvent[],
  opts: { retractFrom?: Date } = {}
): ExternalSyncPlan {
  const existingByUid = new Map(existing.map((e) => [e.externalUid, e]));
  const seenUids = new Set(feedEvents.map((e) => e.externalUid));
  const retractFrom = opts.retractFrom ? toUtcMidnight(opts.retractFrom) : null;

  const changedIds: number[] = [];
  const revivedIds: number[] = [];

  for (const event of feedEvents) {
    const prior = existingByUid.get(event.externalUid);
    if (!prior) continue;
    const datesMoved =
      prior.startDate.getTime() !== event.startDate.getTime() ||
      prior.endDate.getTime() !== event.endDate.getTime();
    if (datesMoved) changedIds.push(prior.id);
    if (prior.status !== "active") revivedIds.push(prior.id);
  }

  const removedIds = existing
    .filter((e) => e.status === "active" && !seenUids.has(e.externalUid))
    // An event still running today counts as current, so `>` not `>=`.
    .filter((e) => retractFrom === null || e.endDate > retractFrom)
    .map((e) => e.id);

  return { upserts: feedEvents, changedIds, removedIds, revivedIds };
}

// ── Fetching ───────────────────────────────────────────────────────────────

interface FetchOutcome {
  status: SyncStatus;
  error?: string;
  events?: NormalizedFeedEvent[];
}

async function fetchFeed(url: string): Promise<FetchOutcome> {
  let text: string;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      // Previously a non-2xx was skipped silently and set no warning at all.
      return { status: "fetch_failed", error: `Feed returned HTTP ${res.status}` };
    }
    text = await res.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: "fetch_failed",
      error: message.includes("timeout") ? "Feed request timed out" : message,
    };
  }

  // An HTML error page or a login redirect is a 200 with a useless body. Treating it as
  // an empty calendar would remove every imported event — exactly what must never happen.
  if (!looksLikeVCalendar(text)) {
    return {
      status: "parse_failed",
      error: "Response was not an iCalendar feed (no BEGIN:VCALENDAR)",
    };
  }

  return { status: "ok", events: normalizeFeedEvents(parseIcsEvents(text)) };
}

// ── Sync state ─────────────────────────────────────────────────────────────

async function recordSyncState(
  propertyId: number,
  data: { status: SyncStatus; error?: string; eventCount?: number; succeeded: boolean }
): Promise<void> {
  const now = new Date();
  const payload = {
    lastAttemptAt: now,
    lastStatus: data.status,
    lastError: data.error ?? null,
    ...(data.succeeded ? { lastSyncedAt: now } : {}),
    ...(data.eventCount !== undefined ? { eventCount: data.eventCount } : {}),
  };
  await prisma.externalCalendarSyncState.upsert({
    where: { propertyId },
    create: { propertyId, ...payload },
    update: payload,
  });
}

/**
 * Atomically claim the right to sync a feed.
 *
 * Returns false when another run attempted this feed inside the staleness window. The
 * conditional `updateMany` is the claim: only one concurrent caller can match the "stale
 * or never attempted" predicate and move `lastAttemptAt` forward, so a burst of
 * simultaneous availability checks triggers at most one outbound fetch.
 */
async function claimSyncSlot(propertyId: number, maxAgeMinutes: number): Promise<boolean> {
  const threshold = new Date(Date.now() - maxAgeMinutes * 60_000);

  const existing = await prisma.externalCalendarSyncState.findUnique({
    where: { propertyId },
    select: { id: true },
  });

  if (!existing) {
    try {
      await prisma.externalCalendarSyncState.create({
        data: { propertyId, lastAttemptAt: new Date() },
      });
      return true;
    } catch (err) {
      // Lost the race to create the row; fall through and try to claim it normally.
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
    }
  }

  const claimed = await prisma.externalCalendarSyncState.updateMany({
    where: {
      propertyId,
      OR: [{ lastAttemptAt: null }, { lastAttemptAt: { lt: threshold } }],
    },
    data: { lastAttemptAt: new Date() },
  });

  return claimed.count > 0;
}

// ── Sync one property ──────────────────────────────────────────────────────

const EMPTY_RESULT = {
  events: 0,
  created: 0,
  updated: 0,
  removed: 0,
  blocksCreated: 0,
  blocksUpdated: 0,
  blocksCancelled: 0,
};

/**
 * Retract this property's current-and-future imported events, then reconcile the sibling
 * blocks they justified. Used when nothing is asserting them any more — no feed URL
 * configured, which is equivalent to a feed that lists nothing.
 *
 * Past events are deliberately left alone: a completed stay is a historical fact, not
 * something a feed can withdraw, and past records affect nothing downstream anyway.
 */
async function retractEvents(
  property: { id: number; name: string; slug: string },
  ctx: { reason: string }
): Promise<{ removed: number; blocksCancelled: number }> {
  const cutoff = todayUtc();

  const stale = await prisma.externalCalendarEvent.findMany({
    where: { propertyId: property.id, status: "active", endDate: { gt: cutoff } },
    select: { id: true },
  });
  if (stale.length === 0) return { removed: 0, blocksCancelled: 0 };

  const ids = stale.map((e) => e.id);
  const res = await prisma.externalCalendarEvent.updateMany({
    where: { id: { in: ids }, status: "active" },
    data: { status: "removed", removedAt: new Date() },
  });

  let blocksCancelled = 0;
  for (const id of ids) {
    const r = await reconcileExternalEventDerivedBlocks(id);
    blocksCancelled += r.cancelled;
  }

  await logAction({
    actor: "System",
    actorRole: "admin",
    action: `Retracted ${res.count} upcoming imported calendar event${res.count === 1 ? "" : "s"} on "${property.name}" — ${ctx.reason}. Past dates left untouched.`,
    module: "bookings",
    target: property.slug,
    metadata: {
      propertyId: property.id,
      eventIds: ids,
      reason: ctx.reason,
      cutoff: utcDateKey(cutoff),
    },
  });

  return { removed: res.count, blocksCancelled };
}

/**
 * Sync a single property's feed and reconcile the sibling blocks it justifies.
 *
 * Pass `force: false` with a `maxAgeMinutes` to make this a no-op when the feed was
 * attempted recently — that is how sync-on-demand avoids stampeding.
 */
export async function syncPropertyFeed(
  propertyId: number,
  opts: { force?: boolean; maxAgeMinutes?: number } = {}
): Promise<PropertySyncResult> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, name: true, slug: true, airbnbIcsUrl: true },
  });

  if (!property) {
    return {
      propertyId,
      propertyName: `#${propertyId}`,
      status: "not_configured",
      error: "Property not found",
      ...EMPTY_RESULT,
    };
  }

  const base = { propertyId: property.id, propertyName: property.name };

  const url = property.airbnbIcsUrl?.trim();
  if (!url) {
    // No feed configured means nothing is asserting imported events for this listing, so
    // current-and-future ones are retracted — the same treatment as a successful but empty
    // feed. This restores the behaviour the site had before events were persisted, when
    // clearing the iCal URL simply stopped the live fetch and those dates reopened at once.
    //
    // Without this, clearing or replacing a URL stranded imported events as `active`
    // forever: sync never ran for the property again, and imported events have no admin
    // control by design, so the only way out was hand-editing the database.
    //
    // PAST events are untouched — see planExternalEventSync. Removing or replacing a feed
    // must never rewrite dates that have already happened.
    const retracted = await retractEvents(property, { reason: "no feed configured" });
    await recordSyncState(property.id, {
      status: "not_configured",
      succeeded: false,
      eventCount: 0,
    });
    return { ...base, status: "not_configured", ...EMPTY_RESULT, ...retracted };
  }

  if (opts.force === false) {
    const claimed = await claimSyncSlot(property.id, opts.maxAgeMinutes ?? 30);
    if (!claimed) return { ...base, status: "ok", skipped: true, ...EMPTY_RESULT };
  }

  const outcome = await fetchFeed(url);

  if (outcome.status !== "ok" || !outcome.events) {
    await recordSyncState(property.id, {
      status: outcome.status,
      error: outcome.error,
      succeeded: false,
    });
    await logAction({
      actor: "System",
      actorRole: "admin",
      action: `External calendar sync failed for "${property.name}" — ${outcome.error ?? outcome.status}`,
      module: "bookings",
      target: property.slug,
      metadata: { propertyId: property.id, status: outcome.status, error: outcome.error },
    });
    // Last known-good events and their derived blocks are left untouched on purpose.
    return { ...base, status: outcome.status, error: outcome.error, ...EMPTY_RESULT };
  }

  const existing = await prisma.externalCalendarEvent.findMany({
    where: { propertyId: property.id },
    select: { id: true, externalUid: true, startDate: true, endDate: true, status: true },
  });

  // Bounded to current-and-future: Airbnb feeds do not carry past reservations, so an
  // unbounded diff would mark every completed stay "removed" on the next sync.
  const plan = planExternalEventSync(outcome.events, existing, { retractFrom: todayUtc() });
  const existingByUid = new Map(existing.map((e) => [e.externalUid, e]));
  const now = new Date();

  let created = 0;
  let updated = 0;
  const touchedIds = new Set<number>();

  for (const event of plan.upserts) {
    const prior = existingByUid.get(event.externalUid);

    const record = await prisma.externalCalendarEvent.upsert({
      where: {
        propertyId_externalUid: { propertyId: property.id, externalUid: event.externalUid },
      },
      create: {
        propertyId: property.id,
        externalUid: event.externalUid,
        summary: event.summary,
        startDate: event.startDate,
        endDate: event.endDate,
        status: "active",
        firstSeenAt: now,
        lastSeenAt: now,
      },
      update: {
        summary: event.summary,
        startDate: event.startDate,
        endDate: event.endDate,
        status: "active",
        removedAt: null,
        lastSeenAt: now,
      },
      select: { id: true },
    });

    if (!prior) {
      created += 1;
      touchedIds.add(record.id);
      await logAction({
        actor: "System",
        actorRole: "admin",
        action: `Imported external calendar event on "${property.name}" (${utcDateKey(event.startDate)} → ${utcDateKey(event.endDate)})`,
        module: "bookings",
        target: property.slug,
        metadata: {
          propertyId: property.id,
          externalEventId: record.id,
          externalUid: event.externalUid,
        },
      });
    } else if (plan.changedIds.includes(prior.id) || plan.revivedIds.includes(prior.id)) {
      updated += 1;
      touchedIds.add(record.id);
      await logAction({
        actor: "System",
        actorRole: "admin",
        action: plan.revivedIds.includes(prior.id)
          ? `External calendar event reappeared on "${property.name}"`
          : `External calendar event modified on "${property.name}" (now ${utcDateKey(event.startDate)} → ${utcDateKey(event.endDate)})`,
        module: "bookings",
        target: property.slug,
        metadata: {
          propertyId: property.id,
          externalEventId: record.id,
          from: prior
            ? { start: utcDateKey(prior.startDate), end: utcDateKey(prior.endDate) }
            : null,
          to: { start: utcDateKey(event.startDate), end: utcDateKey(event.endDate) },
        },
      });
    }
  }

  // Mark vanished events removed. Rows are never deleted, so audit history survives.
  let removed = 0;
  if (plan.removedIds.length > 0) {
    const res = await prisma.externalCalendarEvent.updateMany({
      where: { id: { in: plan.removedIds }, status: "active" },
      data: { status: "removed", removedAt: now },
    });
    removed = res.count;
    for (const id of plan.removedIds) touchedIds.add(id);

    await logAction({
      actor: "System",
      actorRole: "admin",
      action: `External calendar event${removed === 1 ? "" : "s"} removed from "${property.name}" — ${removed} no longer in feed`,
      module: "bookings",
      target: property.slug,
      metadata: { propertyId: property.id, removedEventIds: plan.removedIds },
    });
  }

  // Reconcile sibling blocks only for events that actually changed. Cancelling a removed
  // event's blocks touches ONLY blocks tied to that event — unrelated overlapping blocks,
  // including manual maintenance, are never disturbed.
  let blocksCreated = 0;
  let blocksUpdated = 0;
  let blocksCancelled = 0;
  for (const eventId of touchedIds) {
    const r = await reconcileExternalEventDerivedBlocks(eventId);
    blocksCreated += r.created;
    blocksUpdated += r.updated;
    blocksCancelled += r.cancelled;
  }

  await recordSyncState(property.id, {
    status: "ok",
    succeeded: true,
    eventCount: outcome.events.length,
  });

  return {
    ...base,
    status: "ok",
    events: outcome.events.length,
    created,
    updated,
    removed,
    blocksCreated,
    blocksUpdated,
    blocksCancelled,
  };
}

/**
 * Sync every active property that has a feed configured.
 * Sequential and individually guarded, so one broken feed cannot fail the run.
 */
export async function syncAllActiveProperties(
  opts: { force?: boolean } = {}
): Promise<SyncRunSummary> {
  // Every active property, including those with NO feed URL. Skipping the latter would
  // leave imported events stranded forever when a URL is cleared or replaced, because the
  // retraction lives in syncPropertyFeed. For a property with no URL and nothing to
  // retract this is two cheap queries.
  const properties = await prisma.property.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });

  const results: PropertySyncResult[] = [];

  for (const property of properties) {
    try {
      results.push(await syncPropertyFeed(property.id, { force: opts.force ?? true }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        propertyId: property.id,
        propertyName: property.name,
        status: "fetch_failed",
        error: message,
        ...EMPTY_RESULT,
      });
    }
  }

  return summarize(results);
}

export function summarize(results: PropertySyncResult[]): SyncRunSummary {
  return {
    properties: results.length,
    events: results.reduce((n, r) => n + r.events, 0),
    created: results.reduce((n, r) => n + r.created, 0),
    updated: results.reduce((n, r) => n + r.updated, 0),
    removed: results.reduce((n, r) => n + r.removed, 0),
    blocks: results.reduce((n, r) => n + r.blocksCreated + r.blocksUpdated + r.blocksCancelled, 0),
    failures: results
      .filter((r) => r.status === "fetch_failed" || r.status === "parse_failed")
      .map((r) => ({
        propertyId: r.propertyId,
        propertyName: r.propertyName,
        status: r.status,
        error: r.error,
      })),
    results,
  };
}

/**
 * Sync-on-demand: refresh a property's feed if it has gone stale.
 *
 * This is what decouples correctness from the scheduler. Whatever the cron did or did not
 * manage to run, the feed is brought up to date at the two moments that matter — when a
 * guest checks availability, and immediately before a booking is committed.
 *
 * Best-effort by design: a channel outage must not take the booking flow down with it,
 * matching the fail-open behaviour the site has always had. The difference now is that the
 * failure is recorded and surfaced in admin instead of vanishing.
 */
export async function ensureExternalEventsFresh(
  propertyId: number,
  opts: { maxAgeMinutes: number }
): Promise<void> {
  const state = await prisma.externalCalendarSyncState.findUnique({
    where: { propertyId },
    select: { lastSyncedAt: true },
  });

  const threshold = new Date(Date.now() - opts.maxAgeMinutes * 60_000);
  if (state?.lastSyncedAt && state.lastSyncedAt > threshold) return;

  // force:false makes this a no-op if another request already claimed the slot.
  await syncPropertyFeed(propertyId, { force: false, maxAgeMinutes: opts.maxAgeMinutes });
}
