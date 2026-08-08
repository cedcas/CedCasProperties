"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

/**
 * Availability calendar + manual block manager.
 *
 * Dates here are plain `YYYY-MM-DD` strings end to end, never Date objects. The API sends
 * calendar-date strings and the grid is built from UTC parts, so a US admin and a Manila
 * admin see the same squares — constructing local Dates would shift every cell by a day
 * for anyone behind UTC.
 *
 * Ranges are half-open: a record covering 15→18 occupies the 15th, 16th and 17th. The
 * 18th is free for a same-day check-in, which is why `endDate` is never painted.
 */

interface PropertyOption {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
  hasFeed: boolean;
}

interface ApiBooking {
  id: number;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  status: string;
  totalPrice: number;
}

interface ApiBlock {
  id: number;
  startDate: string;
  endDate: string;
  type: string;
  reason: string;
  reasonLabel: string;
  internalNotes: string | null;
  scope: string;
  status: string;
  isSystemGenerated: boolean;
  affectsAvailability: boolean;
  exportToIcal: boolean;
  sourceBookingId: number | null;
  sourceExternalEventId: number | null;
  parentBlockId: number | null;
  sourcePropertyId: number | null;
  inventoryGroupId: number | null;
  cancelledAt: string | null;
  sourceProperty: { id: number; name: string } | null;
}

interface ApiExternalEvent {
  id: number;
  externalUid: string;
  summary: string | null;
  startDate: string;
  endDate: string;
  status: string;
  lastSeenAt: string;
  removedAt: string | null;
}

interface ApiSyncState {
  lastSyncedAt: string | null;
  lastAttemptAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  eventCount: number;
}

interface ApiGroup {
  groupId: number | null;
  groupName: string | null;
  groupIsActive: boolean;
  siblings: { id: number; name: string }[];
}

interface CalendarData {
  property: { id: number; name: string; slug: string; hasFeed: boolean };
  bookings: ApiBooking[];
  blocks: ApiBlock[];
  externalEvents: ApiExternalEvent[];
  syncState: ApiSyncState | null;
  inventoryGroup: ApiGroup;
}

const REASONS: { value: string; label: string }[] = [
  { value: "maintenance", label: "Maintenance" },
  { value: "owner_use", label: "Owner use" },
  { value: "repair", label: "Repair" },
  { value: "deep_cleaning", label: "Deep cleaning" },
  { value: "pest_control", label: "Pest control" },
  { value: "temporary_hold", label: "Temporary hold" },
  { value: "personal_reservation", label: "Personal reservation" },
  { value: "other", label: "Other" },
];

type MarkerKind = "booking" | "external" | "manual" | "derived" | "maintenance" | "owner_use";

/**
 * Six pairwise-distinct HUES. Getting this wrong is easy here: the brand's
 * `charcoal` token is #335238, which is a GREEN — an earlier revision used
 * `bg-charcoal/60` for maintenance and it read as the same colour as `bg-forest`
 * bookings, so a maintenance block looked like a reservation. Likewise a dusty
 * pink for owner use was confusable with the coral shared-inventory marker.
 *
 * Maintenance keeps the yellow/amber family because it is the archetypal manual
 * block and that is what an admin expects to see; the generic `manual` bucket
 * (any other reason) is a neutral grey.
 *
 * Colour is a hint, not the only channel — every day cell also carries a text
 * `title`/`aria-label`, and clicking a day lists the records in full.
 */
const MARKER_STYLES: Record<MarkerKind, { swatch: string; label: string }> = {
  booking: { swatch: "bg-forest", label: "HIL booking" }, // #4CA750 green
  external: { swatch: "bg-[#2E86C1]", label: "Imported channel event" }, // blue
  derived: { swatch: "bg-[#FF5371]", label: "Shared-inventory block" }, // brand coral
  maintenance: { swatch: "bg-[#E0A800]", label: "Maintenance" }, // amber
  owner_use: { swatch: "bg-[#8A6FBF]", label: "Owner use" }, // purple
  manual: { swatch: "bg-[#6B7280]", label: "Other manual block" }, // neutral grey
};

interface DayEntry {
  kind: MarkerKind;
  title: string;
  detail: string;
  bookingId?: number;
  blockId?: number;
  isSystemGenerated?: boolean;
  canEdit: boolean;
}

// ── UTC-safe date helpers (mirrors src/lib/dates.ts, client-side) ───────────

function dateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function keyToParts(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split("-").map(Number);
  return { y, m: m - 1, d };
}

/** Every occupied day key in a half-open range. `end` is excluded. */
function eachDayKey(startKey: string, endKey: string): string[] {
  const keys: string[] = [];
  const start = keyToParts(startKey);
  const end = keyToParts(endKey);
  const cursor = new Date(Date.UTC(start.y, start.m, start.d));
  const stop = new Date(Date.UTC(end.y, end.m, end.d));
  // Guard against a runaway loop if the API ever returns an inverted range.
  while (cursor < stop && keys.length < 400) {
    keys.push(cursor.toISOString().split("T")[0]);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

/**
 * Default rendering adds the year whenever it isn't the current one, so two records a
 * year apart never render identically and read as a duplicate. Callers passing explicit
 * `opts` control the format entirely.
 */
function formatKey(key: string, opts?: Intl.DateTimeFormatOptions): string {
  const date = new Date(`${key}T00:00:00Z`);
  const resolved: Intl.DateTimeFormatOptions = opts ?? {
    ...(date.getUTCFullYear() === new Date().getUTCFullYear() ? {} : { year: "numeric" }),
    month: "short",
    day: "numeric",
  };
  return date.toLocaleDateString("en-PH", { timeZone: "UTC", ...resolved });
}

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function CalendarClient({
  properties,
  initialPropertyId,
}: {
  properties: PropertyOption[];
  initialPropertyId: number;
}) {
  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return { y: now.getUTCFullYear(), m: now.getUTCMonth() };
  });

  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<number | null>(null);
  const [form, setForm] = useState({
    startDate: "",
    endDate: "",
    reason: "maintenance",
    internalNotes: "",
    scope: "listing_only",
    exportToIcal: true,
  });

  const todayKey = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Fetch a window generously wider than the visible month so ranges that straddle the
  // month boundary are still returned and painted.
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const from = dateKey(month.y, month.m, 1);
      const toDate = new Date(Date.UTC(month.y, month.m + 2, 1));
      const to = toDate.toISOString().split("T")[0];
      const res = await fetch(`/api/admin/calendar?propertyId=${propertyId}&from=${from}&to=${to}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load calendar");
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load calendar");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [propertyId, month]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Map every visible day key to the records covering it. */
  const dayMap = useMemo(() => {
    const map = new Map<string, DayEntry[]>();
    if (!data) return map;

    const push = (key: string, entry: DayEntry) => {
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    };

    /**
     * Name the HIL-originated record that fully covers [start, end), if any.
     *
     * Coverage counts bookings and admin-created blocks only — never derived blocks or
     * other imported events, since those can themselves be links in an echo chain.
     * Mirrors loadHilCoverage + isFullyCovered on the server; kept as a per-day-set check
     * over merged coverage so a run of back-to-back records counts as continuous.
     */
    const coveringHilRecord = (start: string, end: string): string | null => {
      const nights = eachDayKey(start, end);
      if (nights.length === 0) return null;

      const covered = new Set<string>();
      let label: string | null = null;

      for (const b of data.bookings) {
        if (b.status === "cancelled") continue;
        const own = eachDayKey(b.checkIn, b.checkOut);
        if (own.some((n) => nights.includes(n))) {
          own.forEach((n) => covered.add(n));
          label ??= `booking #${b.id}`;
        }
      }
      for (const bl of data.blocks) {
        if (bl.status !== "active" || bl.isSystemGenerated || !bl.affectsAvailability) continue;
        const own = eachDayKey(bl.startDate, bl.endDate);
        if (own.some((n) => nights.includes(n))) {
          own.forEach((n) => covered.add(n));
          label ??= `the ${bl.reasonLabel.toLowerCase()} block`;
        }
      }

      return nights.every((n) => covered.has(n)) ? label : null;
    };

    for (const b of data.bookings) {
      if (b.status === "cancelled") continue;
      for (const key of eachDayKey(b.checkIn, b.checkOut)) {
        push(key, {
          kind: "booking",
          title: `${b.guestName} — booking #${b.id}`,
          detail: `${b.status} · ${b.guests} guest${b.guests === 1 ? "" : "s"} · ${formatKey(b.checkIn)} → ${formatKey(b.checkOut)}`,
          bookingId: b.id,
          canEdit: false,
        });
      }
    }

    for (const e of data.externalEvents) {
      if (e.status !== "active") continue;

      // Mirror the server's echo rule (planDerivedBlocks / isFullyCovered) so the admin can
      // SEE why an imported event produced no sibling blocks, instead of assuming it failed.
      // HIL and the channel sync both ways, so our own exported block comes back as an
      // "imported" event; when HIL already covers those nights it is redundant and must not
      // propagate, or it would outlive the record that caused it.
      const cover = coveringHilRecord(e.startDate, e.endDate);

      for (const key of eachDayKey(e.startDate, e.endDate)) {
        push(key, {
          kind: "external",
          title: e.summary?.trim() ? `Imported — ${e.summary}` : "Imported channel event",
          detail: cover
            ? `From this listing's external calendar feed · ${formatKey(e.startDate)} → ${formatKey(e.endDate)} · already covered by ${cover}, so it is not propagating to sibling listings`
            : `From this listing's external calendar feed · ${formatKey(e.startDate)} → ${formatKey(e.endDate)}`,
          canEdit: false,
        });
      }
    }

    for (const bl of data.blocks) {
      if (bl.status !== "active") continue;
      const kind: MarkerKind = bl.isSystemGenerated
        ? "derived"
        : bl.reason === "maintenance"
          ? "maintenance"
          : bl.reason === "owner_use"
            ? "owner_use"
            : "manual";

      const detail = bl.isSystemGenerated
        ? `Generated because ${bl.sourceProperty?.name ?? "a sibling listing"} is occupied${bl.sourceBookingId ? ` (booking #${bl.sourceBookingId})` : bl.sourceExternalEventId ? " (imported event)" : ""}. Edit the source, not this block.`
        : `${bl.reasonLabel}${bl.scope === "inventory_group" ? " · whole inventory group" : ""}${bl.internalNotes ? ` · ${bl.internalNotes}` : ""}`;

      for (const key of eachDayKey(bl.startDate, bl.endDate)) {
        push(key, {
          kind,
          title: bl.isSystemGenerated ? "Shared inventory block" : bl.reasonLabel,
          detail,
          blockId: bl.id,
          isSystemGenerated: bl.isSystemGenerated,
          canEdit: !bl.isSystemGenerated,
        });
      }
    }

    return map;
  }, [data]);

  /** Leading blanks + day cells for the visible month. */
  const cells = useMemo(() => {
    const firstWeekday = new Date(Date.UTC(month.y, month.m, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate();
    const out: (string | null)[] = Array(firstWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(dateKey(month.y, month.m, d));
    return out;
  }, [month]);

  const selectedEntries = selectedDay ? (dayMap.get(selectedDay) ?? []) : [];

  const shiftMonth = (delta: number) => {
    setSelectedDay(null);
    setMonth((prev) => {
      const next = new Date(Date.UTC(prev.y, prev.m + delta, 1));
      return { y: next.getUTCFullYear(), m: next.getUTCMonth() };
    });
  };

  const runSync = async (single: boolean) => {
    setSyncing(true);
    setError("");
    setSuccess("");
    try {
      const url = single
        ? `/api/cron/sync-external-calendars?propertyId=${propertyId}`
        : "/api/cron/sync-external-calendars";
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Sync failed");
      const failed = (json.failures ?? []) as { propertyName: string; error?: string }[];
      if (failed.length > 0) {
        setError(
          `Sync problems: ${failed.map((f) => `${f.propertyName} — ${f.error ?? "failed"}`).join("; ")}`
        );
      } else {
        setSuccess(
          `Synced — ${json.created ?? 0} new, ${json.updated ?? 0} updated, ${json.removed ?? 0} removed, ${json.blocks ?? 0} block change${(json.blocks ?? 0) === 1 ? "" : "s"}.`
        );
      }
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const openCreateForm = (dayKey?: string) => {
    setEditingBlockId(null);
    setForm({
      startDate: dayKey ?? "",
      endDate: "",
      reason: "maintenance",
      internalNotes: "",
      scope: "listing_only",
      exportToIcal: true,
    });
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const openEditForm = (block: ApiBlock) => {
    setEditingBlockId(block.id);
    setForm({
      startDate: block.startDate,
      endDate: block.endDate,
      reason: block.reason,
      internalNotes: block.internalNotes ?? "",
      scope: block.scope,
      exportToIcal: block.exportToIcal,
    });
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const submitBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const isEdit = editingBlockId !== null;
      const res = await fetch(
        isEdit
          ? `/api/admin/availability-blocks/${editingBlockId}`
          : "/api/admin/availability-blocks",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId,
            startDate: form.startDate,
            endDate: form.endDate || null,
            reason: form.reason,
            internalNotes: form.internalNotes,
            scope: form.scope,
            exportToIcal: form.exportToIcal,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save block");

      const affected = (json.affectedProperties ?? []) as { name: string }[];
      setSuccess(
        isEdit
          ? "Block updated."
          : affected.length > 0
            ? `Block created — also blocked on ${affected.map((p) => p.name).join(", ")}.`
            : "Block created."
      );
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save block");
    } finally {
      setSaving(false);
    }
  };

  const cancelBlock = async (blockId: number) => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/availability-blocks/${blockId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to cancel block");
      setSuccess("Block cancelled.");
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to cancel block");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full px-4 py-2.5 rounded-[10px] border border-black/[.10] bg-[#F8F9FA] text-[14px] text-charcoal focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/10 transition-all duration-200";
  const labelCls =
    "text-[11.5px] font-semibold text-charcoal/60 tracking-wide uppercase mb-1.5 block";
  const cardCls =
    "bg-white rounded-[16px] shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04]";

  const group = data?.inventoryGroup;
  const sync = data?.syncState;
  const activeBlocks = (data?.blocks ?? []).filter((b) => b.status === "active");
  const editableBlocks = activeBlocks.filter((b) => !b.isSystemGenerated);
  // This listing's OWN reservations. They occupy dates but are not AvailabilityBlock rows,
  // so they never appear in the blocks table below — counted here to say so explicitly.
  const ownBookingCount = (data?.bookings ?? []).filter((b) => b.status !== "cancelled").length;

  return (
    <div className="space-y-5">
      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div className={`${cardCls} p-5`}>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[220px] flex-1">
            <label className={labelCls} htmlFor="calendar-property">
              Property
            </label>
            <select
              id="calendar-property"
              className={inputCls}
              value={propertyId}
              onChange={(e) => {
                setPropertyId(Number(e.target.value));
                setSelectedDay(null);
              }}
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.isActive ? "" : " (inactive)"}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => openCreateForm()}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold text-white"
            style={{ background: "linear-gradient(135deg,#FF5371,#E03D5A)" }}
          >
            <i className="fa-solid fa-ban" /> Block dates
          </button>

          <button
            type="button"
            onClick={() => runSync(false)}
            disabled={syncing}
            className="text-charcoal/70 inline-flex items-center gap-2 rounded-full border border-black/[.12] px-5 py-2.5 text-[13px] font-semibold transition-all duration-200 hover:bg-black/[.04] disabled:opacity-60"
          >
            <i className={`fa-solid ${syncing ? "fa-spinner fa-spin" : "fa-rotate"}`} />
            {syncing ? "Syncing…" : "Sync channel calendars now"}
          </button>
        </div>

        {/* Feed health. A broken feed used to fail open silently; now it is visible. */}
        {data?.property.hasFeed && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px]">
            {sync?.lastStatus === "ok" || (sync?.lastSyncedAt && !sync?.lastError) ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 font-semibold text-green-700">
                <i className="fa-solid fa-circle-check" /> Channel feed synced{" "}
                {relativeTime(sync?.lastSyncedAt ?? null)}
                {sync?.eventCount !== undefined
                  ? ` · ${sync.eventCount} event${sync.eventCount === 1 ? "" : "s"}`
                  : ""}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 font-semibold text-red-600">
                <i className="fa-solid fa-triangle-exclamation" /> Feed sync failing
                {sync?.lastError ? ` — ${sync.lastError}` : ""}
              </span>
            )}
            <button
              type="button"
              onClick={() => runSync(true)}
              disabled={syncing}
              className="text-forest font-semibold hover:underline disabled:opacity-60"
            >
              Refresh this listing
            </button>
            {sync?.lastError && sync?.lastSyncedAt && (
              <span className="text-charcoal/45">
                Existing imported dates are still blocked from the last good sync.
              </span>
            )}
          </div>
        )}

        {/* Inventory group context */}
        {group?.groupId && (
          <div className="text-charcoal/60 mt-4 text-[12.5px]">
            <i className="fa-solid fa-layer-group text-charcoal/40 mr-1.5" />
            Shares inventory with{" "}
            <strong className="text-charcoal/80">
              {group.siblings.map((s) => s.name).join(", ") || "no other listing"}
            </strong>{" "}
            via group &ldquo;{group.groupName}&rdquo;
            {group.groupIsActive ? (
              <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                Active
              </span>
            ) : (
              <span className="bg-charcoal/10 text-charcoal/60 ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                Inactive — not propagating
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
          <i className="fa-solid fa-circle-exclamation mt-0.5" /> {error}
        </div>
      )}
      {success && <p className="px-1 text-[13px] text-green-600">{success}</p>}

      {/* ── Block form ───────────────────────────────────────────────────── */}
      {showForm && (
        <form onSubmit={submitBlock} className={`${cardCls} space-y-5 p-6`}>
          <div className="flex items-center justify-between">
            <h3 className="text-charcoal font-serif font-semibold">
              {editingBlockId ? `Edit block #${editingBlockId}` : "Block dates"}
            </h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-charcoal/40 hover:text-charcoal text-[13px]"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="block-start">
                Start date
              </label>
              <input
                id="block-start"
                type="date"
                required
                className={inputCls}
                value={form.startDate}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="block-end">
                End date{" "}
                <span className="text-charcoal/40 font-normal normal-case">
                  (check-out day — not blocked)
                </span>
              </label>
              <input
                id="block-end"
                type="date"
                className={inputCls}
                value={form.endDate}
                min={form.startDate || undefined}
                onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
              />
              <p className="text-charcoal/45 mt-1.5 text-[11.5px]">
                Leave empty to block a single night.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="block-reason">
                Reason
              </label>
              <select
                id="block-reason"
                className={inputCls}
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="block-scope">
                Scope
              </label>
              <select
                id="block-scope"
                className={inputCls}
                value={form.scope}
                onChange={(e) => setForm((p) => ({ ...p, scope: e.target.value }))}
              >
                <option value="listing_only">This listing only</option>
                <option value="inventory_group" disabled={!group?.groupId}>
                  Entire shared inventory group
                </option>
              </select>
              {/* Preview — needs no extra request; the group came with the calendar payload. */}
              {form.scope === "inventory_group" && (
                <p className="text-charcoal/60 mt-1.5 text-[11.5px]">
                  {group?.groupId && group.siblings.length > 0 ? (
                    group.groupIsActive ? (
                      <>
                        <i className="fa-solid fa-arrow-turn-down text-charcoal/40 mr-1" />
                        Will also block:{" "}
                        <strong>{group.siblings.map((s) => s.name).join(", ")}</strong>
                      </>
                    ) : (
                      <span className="text-charcoal/45">
                        Group &ldquo;{group.groupName}&rdquo; is inactive, so nothing will propagate
                        until it is activated.
                      </span>
                    )
                  ) : (
                    <span className="text-charcoal/45">
                      This listing is not in an inventory group.
                    </span>
                  )}
                </p>
              )}
              {!group?.groupId && (
                <p className="text-charcoal/45 mt-1.5 text-[11.5px]">
                  <Link
                    href="/admin/properties/inventory-groups"
                    className="text-forest font-semibold hover:underline"
                  >
                    Set up an inventory group
                  </Link>{" "}
                  to block sibling listings together.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="block-notes">
              Internal notes{" "}
              <span className="text-charcoal/40 font-normal normal-case">
                (never shown to guests)
              </span>
            </label>
            <textarea
              id="block-notes"
              rows={2}
              className={inputCls}
              value={form.internalNotes}
              onChange={(e) => setForm((p) => ({ ...p, internalNotes: e.target.value }))}
              placeholder="e.g. Aircon replacement, technician booked 9am"
            />
          </div>

          <label className="text-charcoal/70 flex items-start gap-2.5 text-[13px]">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={form.exportToIcal}
              onChange={(e) => setForm((p) => ({ ...p, exportToIcal: e.target.checked }))}
            />
            <span>
              Export through the iCal feed
              <span className="text-charcoal/45 block text-[11.5px]">
                Recommended — this is what stops the dates being booked on Airbnb and other
                connected channels.
              </span>
            </span>
          </label>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full px-7 py-2.5 text-[13.5px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#FF5371,#E03D5A)" }}
            >
              {saving ? (
                <span>
                  <i className="fa-solid fa-spinner fa-spin mr-2" />
                  Saving…
                </span>
              ) : editingBlockId ? (
                "Save Changes"
              ) : (
                "Create Block"
              )}
            </button>
            {editingBlockId && (
              <button
                type="button"
                onClick={() => cancelBlock(editingBlockId)}
                disabled={saving}
                className="rounded-full border border-red-200 px-7 py-2.5 text-[13.5px] font-semibold text-red-600 transition-all duration-200 hover:bg-red-50 disabled:opacity-60"
              >
                Cancel this block
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-charcoal/60 rounded-full border border-black/[.12] px-7 py-2.5 text-[13.5px] font-semibold transition-all duration-200 hover:bg-black/[.04]"
            >
              Close
            </button>
          </div>
        </form>
      )}

      {/* ── Month grid ───────────────────────────────────────────────────── */}
      <div className={`${cardCls} p-5`}>
        <div className="mb-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="text-charcoal/60 hover:text-forest hover:border-forest h-9 w-9 rounded-full border border-black/[.10] transition-colors"
            aria-label="Previous month"
          >
            <i className="fa-solid fa-chevron-left text-[12px]" />
          </button>
          <h3 className="text-charcoal font-serif text-[1.05rem] font-semibold">
            {new Date(Date.UTC(month.y, month.m, 1)).toLocaleDateString("en-PH", {
              timeZone: "UTC",
              month: "long",
              year: "numeric",
            })}
          </h3>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="text-charcoal/60 hover:text-forest hover:border-forest h-9 w-9 rounded-full border border-black/[.10] transition-colors"
            aria-label="Next month"
          >
            <i className="fa-solid fa-chevron-right text-[12px]" />
          </button>
        </div>

        {loading ? (
          <div className="text-charcoal/40 py-16 text-center text-[14px]">
            <i className="fa-solid fa-spinner fa-spin mr-2" /> Loading calendar…
          </div>
        ) : (
          <>
            <div className="mb-1.5 grid grid-cols-7 gap-1.5">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div
                  key={d}
                  className="text-charcoal/50 py-1 text-center text-[11px] font-semibold tracking-wide uppercase"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((key, i) => {
                if (!key) return <div key={`blank-${i}`} />;
                const entries = dayMap.get(key) ?? [];
                const isPast = key < todayKey;
                const isSelected = key === selectedDay;
                const kinds = [...new Set(entries.map((e) => e.kind))];

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDay(isSelected ? null : key)}
                    className={`min-h-[62px] rounded-[10px] border p-1.5 text-left transition-colors ${
                      isSelected
                        ? "border-forest ring-forest/20 ring-2"
                        : "hover:border-forest/40 border-black/[.06]"
                    } ${isPast ? "bg-black/[.02] opacity-55" : entries.length > 0 ? "bg-[#FAFAFA]" : "bg-white"}`}
                    // Text cue as well as colour: six hues on a 2px dot is not enough on
                    // its own, and it fails entirely for a colour-blind admin.
                    title={
                      entries.length > 0
                        ? entries
                            .map((e) => `${MARKER_STYLES[e.kind].label}: ${e.title}`)
                            .join("\n")
                        : "Available"
                    }
                    aria-label={`${formatKey(key, { month: "long", day: "numeric" })} — ${
                      entries.length > 0
                        ? [...new Set(entries.map((e) => MARKER_STYLES[e.kind].label))].join(", ")
                        : "available"
                    }`}
                  >
                    <span
                      className={`text-[12.5px] font-semibold ${entries.length > 0 ? "text-charcoal" : "text-charcoal/50"}`}
                    >
                      {keyToParts(key).d}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {kinds.map((k) => (
                        <span
                          key={k}
                          className={`h-2 w-2 rounded-full ${MARKER_STYLES[k].swatch}`}
                        />
                      ))}
                    </span>
                    {/* Name the dominant record inline so the grid is readable without
                        decoding colours or hovering. */}
                    {entries.length > 0 && (
                      <span className="text-charcoal/55 mt-0.5 block truncate text-[9.5px] leading-tight">
                        {MARKER_STYLES[kinds[0]].label
                          .replace(" block", "")
                          .replace("Imported channel event", "Imported")}
                        {kinds.length > 1 ? ` +${kinds.length - 1}` : ""}
                      </span>
                    )}
                    {entries.length === 0 && !isPast && (
                      <span className="text-charcoal/30 mt-0.5 block text-[10px]">Available</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-black/[.06] pt-4">
              {(Object.keys(MARKER_STYLES) as MarkerKind[]).map((k) => (
                <span
                  key={k}
                  className="text-charcoal/55 inline-flex items-center gap-1.5 text-[11.5px]"
                >
                  <span className={`h-2 w-2 rounded-full ${MARKER_STYLES[k].swatch}`} />{" "}
                  {MARKER_STYLES[k].label}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Why is this date blocked? ────────────────────────────────────── */}
      {selectedDay && (
        <div className={`${cardCls} p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-charcoal font-serif font-semibold">
              {formatKey(selectedDay, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </h3>
            <button
              type="button"
              onClick={() => openCreateForm(selectedDay)}
              className="text-forest text-[12px] font-semibold hover:underline"
            >
              Block this date
            </button>
          </div>

          {selectedEntries.length === 0 ? (
            <p className="text-charcoal/50 text-[13.5px]">
              Available — nothing is blocking this date.
            </p>
          ) : (
            <ul className="space-y-3">
              {selectedEntries.map((entry, i) => (
                <li
                  key={`${entry.kind}-${entry.blockId ?? entry.bookingId ?? i}`}
                  className="flex items-start gap-3"
                >
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${MARKER_STYLES[entry.kind].swatch}`}
                  />
                  <div className="min-w-0">
                    <p className="text-charcoal text-[13.5px] font-semibold">{entry.title}</p>
                    <p className="text-charcoal/55 text-[12.5px]">{entry.detail}</p>
                    <div className="mt-1 flex items-center gap-3">
                      {entry.bookingId && (
                        <Link
                          href={`/admin/bookings/${entry.bookingId}`}
                          className="text-forest text-[12px] font-semibold hover:underline"
                        >
                          Open booking →
                        </Link>
                      )}
                      {entry.canEdit && entry.blockId && (
                        <button
                          type="button"
                          onClick={() => {
                            const block = activeBlocks.find((b) => b.id === entry.blockId);
                            if (block) openEditForm(block);
                          }}
                          className="text-forest text-[12px] font-semibold hover:underline"
                        >
                          Edit block
                        </button>
                      )}
                      {entry.isSystemGenerated && (
                        <span className="text-charcoal/40 text-[11px]">
                          Read-only — managed by the inventory group
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Manual blocks list ───────────────────────────────────────────── */}
      <div className={`${cardCls} overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-black/[.06] px-5 py-4">
          <div>
            {/* "In this window", not "Upcoming": the grid fetches from the 1st of the
                visible month, so a block that has already ended earlier this month is
                legitimately listed here. Calling those "upcoming" was simply wrong. */}
            <h3 className="text-charcoal font-serif font-semibold">
              Availability blocks in this window
            </h3>
            {/* This table lists BLOCKS only. A listing's own reservations are Booking
                records, not blocks — the source event always stays on its own property and
                only DERIVED blocks are created on siblings. Saying so here prevents the
                reasonable misreading that a listing with fewer rows is less protected. */}
            <p className="text-charcoal/45 mt-1 text-[12px]">
              Blocks only.{" "}
              {ownBookingCount > 0 ? (
                <>
                  This listing&apos;s own {ownBookingCount} booking
                  {ownBookingCount === 1 ? "" : "s"} in this window{" "}
                  {ownBookingCount === 1 ? "is" : "are"} shown on the calendar above, not here.
                </>
              ) : (
                <>This listing has no bookings of its own in this window.</>
              )}
            </p>
          </div>
          <span className="text-charcoal/45 shrink-0 text-[12px]">
            {activeBlocks.length} active ({editableBlocks.length} manual)
          </span>
        </div>

        {activeBlocks.length === 0 ? (
          <div className="py-14 text-center">
            <i className="fa-solid fa-calendar-check text-charcoal/20 mb-3 block text-[2.4rem]" />
            <p className="text-charcoal/40 text-[14px]">No availability blocks in this window.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-black/[.06] bg-[#F8F9FA]">
                  {["Dates", "Type", "Reason", "Scope", "iCal", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="text-charcoal/50 px-5 py-3.5 text-left text-[11px] font-semibold tracking-wide uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[.05]">
                {activeBlocks.map((b) => (
                  <tr key={b.id} className="transition-colors hover:bg-[#FAFAFA]">
                    <td className="text-charcoal/80 px-5 py-4 text-[13px]">
                      {formatKey(b.startDate)} → {formatKey(b.endDate)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          b.isSystemGenerated
                            ? "bg-[#FF5371]/15 text-[#E03D5A]"
                            : "text-charcoal/70 bg-[#FFDD3F]/25"
                        }`}
                      >
                        {b.isSystemGenerated ? "Shared inventory" : "Manual"}
                      </span>
                    </td>
                    <td className="text-charcoal/70 px-5 py-4 text-[13px]">
                      {b.isSystemGenerated ? (
                        <span className="text-charcoal/55">
                          from {b.sourceProperty?.name ?? "sibling"}
                          {b.sourceBookingId
                            ? ` · booking #${b.sourceBookingId}`
                            : b.sourceExternalEventId
                              ? " · imported event"
                              : ""}
                        </span>
                      ) : (
                        b.reasonLabel
                      )}
                    </td>
                    <td className="text-charcoal/60 px-5 py-4 text-[13px]">
                      {b.scope === "inventory_group" ? "Whole group" : "This listing"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          b.exportToIcal
                            ? "bg-green-100 text-green-700"
                            : "bg-charcoal/10 text-charcoal/50"
                        }`}
                      >
                        {b.exportToIcal ? "Exported" : "Internal"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {b.isSystemGenerated ? (
                        <span className="text-charcoal/35 text-[12px]">Edit the source</span>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => openEditForm(b)}
                            className="text-forest text-[12px] font-semibold hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelBlock(b.id)}
                            disabled={saving}
                            className="text-[12px] font-semibold text-red-600 hover:underline disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
