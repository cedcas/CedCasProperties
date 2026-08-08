"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

/**
 * Create, rename, activate/deactivate and populate shared inventory groups.
 *
 * Groups are created INACTIVE on purpose. Activating one immediately starts writing
 * sibling blocks that flow out through the iCal feeds to live channels, so the UI makes
 * that a separate, deliberate action after the membership has been reviewed.
 */

interface MemberProperty {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
  maxGuests: number;
}

interface Member {
  id: number;
  propertyId: number;
  property: MemberProperty;
}

interface PropagatedBlock {
  id: number;
  propertyId: number;
  startDate: string;
  endDate: string;
  sourcePropertyId: number | null;
  sourceBookingId: number | null;
  sourceExternalEventId: number | null;
  property: { name: string };
  sourceProperty: { name: string } | null;
}

interface Group {
  id: number;
  name: string;
  isActive: boolean;
  notes: string | null;
  members: Member[];
  blocks: PropagatedBlock[];
}

/**
 * Show the year whenever it isn't the current one.
 *
 * Without it, a block for Aug 8 2026 and one for Aug 8 2027 both render as "Aug 8" and
 * read as a duplicate bug — which is exactly how this list first looked in production,
 * where two source events a year apart produced eight entirely correct blocks that
 * appeared to be four repeated twice.
 */
function formatDate(iso: string): string {
  const date = new Date(iso);
  const thisYear = new Date().getUTCFullYear();
  return date.toLocaleDateString("en-PH", {
    timeZone: "UTC",
    ...(date.getUTCFullYear() === thisYear ? {} : { year: "numeric" }),
    month: "short",
    day: "numeric",
  });
}

export default function InventoryGroupsClient() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [available, setAvailable] = useState<MemberProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newMembers, setNewMembers] = useState<number[]>([]);

  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [addSelection, setAddSelection] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/inventory-groups");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load inventory groups");
      setGroups(json.groups ?? []);
      setAvailable(json.availableProperties ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load inventory groups");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await fn();
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const post = async (url: string, body: unknown, method = "POST") => {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "Request failed");
    return json;
  };

  const createGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setError("Group name is required");
      return;
    }
    void run(async () => {
      await post("/api/admin/inventory-groups", {
        name: newName.trim(),
        notes: newNotes.trim() || undefined,
        propertyIds: newMembers,
        isActive: false,
      });
      setSuccess(
        `Group "${newName.trim()}" created — inactive. Review the members, then activate it.`
      );
      setShowCreate(false);
      setNewName("");
      setNewNotes("");
      setNewMembers([]);
    });
  };

  const toggleActive = (group: Group) =>
    void run(async () => {
      await post(`/api/admin/inventory-groups/${group.id}`, { isActive: !group.isActive }, "PATCH");
      setSuccess(
        group.isActive
          ? `"${group.name}" deactivated — future propagated blocks have been cancelled. Past ones are kept as history.`
          : `"${group.name}" activated — sibling blocks are being created for existing reservations.`
      );
    });

  const rename = (groupId: number) =>
    void run(async () => {
      await post(`/api/admin/inventory-groups/${groupId}`, { name: renameValue.trim() }, "PATCH");
      setRenamingId(null);
      setSuccess("Group renamed.");
    });

  const addMember = (groupId: number) => {
    const propertyId = Number(addSelection[groupId]);
    if (!Number.isInteger(propertyId) || propertyId <= 0) {
      setError("Choose a property to add");
      return;
    }
    void run(async () => {
      await post(`/api/admin/inventory-groups/${groupId}/members`, { propertyId });
      setAddSelection((prev) => ({ ...prev, [groupId]: "" }));
      setSuccess("Property added to the group.");
    });
  };

  const removeMember = (groupId: number, propertyId: number, name: string) =>
    void run(async () => {
      await post(`/api/admin/inventory-groups/${groupId}/members`, { propertyId }, "DELETE");
      setSuccess(`"${name}" removed — its future propagated blocks have been reconciled.`);
    });

  const deleteGroup = (group: Group) =>
    void run(async () => {
      await post(`/api/admin/inventory-groups/${group.id}`, {}, "DELETE");
      setSuccess(`Group "${group.name}" deleted and its future propagated blocks cancelled.`);
    });

  const inputCls =
    "w-full px-4 py-2.5 rounded-[10px] border border-black/[.10] bg-[#F8F9FA] text-[14px] text-charcoal focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/10 transition-all duration-200";
  const labelCls =
    "text-[11.5px] font-semibold text-charcoal/60 tracking-wide uppercase mb-1.5 block";
  const cardCls =
    "bg-white rounded-[16px] shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04]";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-charcoal/45 text-[13px]">
          {loading ? "Loading…" : `${groups.length} group${groups.length === 1 ? "" : "s"}`}
        </p>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold text-white"
          style={{ background: "linear-gradient(135deg,#FF5371,#E03D5A)" }}
        >
          <i className="fa-solid fa-plus" /> New Group
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
          <i className="fa-solid fa-circle-exclamation mt-0.5" /> {error}
        </div>
      )}
      {success && <p className="px-1 text-[13px] text-green-600">{success}</p>}

      {showCreate && (
        <form onSubmit={createGroup} className={`${cardCls} space-y-5 p-6`}>
          <h3 className="text-charcoal font-serif font-semibold">New inventory group</h3>

          <div>
            <label className={labelCls} htmlFor="group-name">
              Group name
            </label>
            <input
              id="group-name"
              className={inputCls}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Mickey in Lipa"
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="group-notes">
              Notes{" "}
              <span className="text-charcoal/40 font-normal normal-case">(optional, internal)</span>
            </label>
            <input
              id="group-notes"
              className={inputCls}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="e.g. Same unit, listed as 1BR / 2BR / 3BR configurations"
            />
          </div>

          <div>
            <span className={labelCls}>Members</span>
            {available.length === 0 ? (
              <p className="text-charcoal/45 text-[13px]">
                Every property already belongs to a group. A property may belong to only one.
              </p>
            ) : (
              <div className="space-y-2">
                {available.map((p) => (
                  <label
                    key={p.id}
                    className="text-charcoal/75 flex items-center gap-2.5 text-[13.5px]"
                  >
                    <input
                      type="checkbox"
                      checked={newMembers.includes(p.id)}
                      onChange={(e) =>
                        setNewMembers((prev) =>
                          e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                        )
                      }
                    />
                    <span>
                      {p.name}
                      <span className="text-charcoal/40"> · sleeps {p.maxGuests}</span>
                      {!p.isActive && <span className="text-charcoal/40"> · inactive</span>}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <p className="text-charcoal/55 rounded-[8px] border border-black/[.05] bg-[#FFF8FA] px-3.5 py-2.5 text-[12px]">
            <i className="fa-solid fa-circle-info text-charcoal/40 mr-1.5" />
            The group is created <strong>inactive</strong> and propagates nothing. Review the
            members, then activate it — that is when sibling blocks start being created and pushed
            to connected channels.
          </p>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded-full px-7 py-2.5 text-[13.5px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#FF5371,#E03D5A)" }}
            >
              {busy ? (
                <span>
                  <i className="fa-solid fa-spinner fa-spin mr-2" />
                  Creating…
                </span>
              ) : (
                "Create Group"
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-charcoal/60 rounded-full border border-black/[.12] px-7 py-2.5 text-[13.5px] font-semibold transition-all duration-200 hover:bg-black/[.04]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {!loading && groups.length === 0 && !showCreate && (
        <div className={`${cardCls} py-20 text-center`}>
          <i className="fa-solid fa-layer-group text-charcoal/20 mb-4 block text-[3rem]" />
          <p className="text-charcoal/40 text-[15px]">No inventory groups yet.</p>
          <p className="text-charcoal/35 mt-1 text-[13px]">
            Every property behaves independently until you group it — nothing changes until then.
          </p>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.id} className={`${cardCls} overflow-hidden`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[.06] px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              {renamingId === group.id ? (
                <>
                  <input
                    className="text-charcoal rounded-[8px] border border-black/[.12] px-3 py-1.5 text-[14px]"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => rename(group.id)}
                    disabled={busy || !renameValue.trim()}
                    className="text-forest text-[12px] font-semibold hover:underline disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenamingId(null)}
                    className="text-charcoal/45 hover:text-charcoal text-[12px]"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-charcoal truncate font-serif text-[1.05rem] font-semibold">
                    {group.name}
                  </h3>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      group.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-charcoal/10 text-charcoal/60"
                    }`}
                  >
                    {group.isActive ? "Active" : "Inactive"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingId(group.id);
                      setRenameValue(group.name);
                    }}
                    className="text-forest text-[12px] font-semibold hover:underline"
                  >
                    Rename
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleActive(group)}
                disabled={busy}
                className={`text-[12px] font-semibold hover:underline disabled:opacity-50 ${
                  group.isActive ? "text-charcoal/60" : "text-forest"
                }`}
              >
                {group.isActive ? "Deactivate" : "Activate"}
              </button>
              <button
                type="button"
                onClick={() => deleteGroup(group)}
                disabled={busy}
                className="text-[12px] font-semibold text-red-600 hover:underline disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="space-y-5 p-5">
            {group.notes && <p className="text-charcoal/55 text-[13px]">{group.notes}</p>}

            {!group.isActive && (
              <p className="text-charcoal/55 rounded-[8px] border border-black/[.05] bg-[#FFF8FA] px-3.5 py-2.5 text-[12.5px]">
                <i className="fa-solid fa-circle-info text-charcoal/40 mr-1.5" />
                Inactive — these listings are behaving completely independently. Nothing propagates
                until you activate.
              </p>
            )}

            {/* Members */}
            <div>
              <p className="text-charcoal/60 mb-2 text-[11.5px] font-semibold tracking-wide uppercase">
                Members ({group.members.length})
              </p>
              {group.members.length === 0 ? (
                <p className="text-charcoal/45 text-[13px]">No properties in this group yet.</p>
              ) : (
                <ul className="space-y-2">
                  {group.members.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-3 rounded-[10px] border border-black/[.04] bg-[#F8F9FA] px-3.5 py-2.5"
                    >
                      <span className="text-charcoal/80 min-w-0 truncate text-[13.5px]">
                        {m.property.name}
                        <span className="text-charcoal/40"> · sleeps {m.property.maxGuests}</span>
                        {!m.property.isActive && (
                          <span className="text-charcoal/40"> · inactive</span>
                        )}
                      </span>
                      <div className="flex shrink-0 items-center gap-3">
                        <Link
                          href={`/admin/calendar?propertyId=${m.propertyId}`}
                          className="text-forest text-[12px] font-semibold hover:underline"
                        >
                          Calendar
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeMember(group.id, m.propertyId, m.property.name)}
                          disabled={busy}
                          className="text-[12px] font-semibold text-red-600 hover:underline disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {available.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2.5">
                  <select
                    className="text-charcoal rounded-[8px] border border-black/[.10] bg-white px-3 py-2 text-[13px]"
                    value={addSelection[group.id] ?? ""}
                    onChange={(e) =>
                      setAddSelection((prev) => ({ ...prev, [group.id]: e.target.value }))
                    }
                    aria-label={`Add a property to ${group.name}`}
                  >
                    <option value="">Add a property…</option>
                    {available.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (sleeps {p.maxGuests})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => addMember(group.id)}
                    disabled={busy || !addSelection[group.id]}
                    className="text-forest text-[12px] font-semibold hover:underline disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Upcoming propagated blocks — the group's live effect */}
            <div>
              <p className="text-charcoal/60 mb-2 text-[11.5px] font-semibold tracking-wide uppercase">
                Upcoming propagated blocks ({group.blocks.length})
              </p>
              {group.blocks.length === 0 ? (
                <p className="text-charcoal/45 text-[13px]">
                  {group.isActive
                    ? "Nothing propagated yet — no overlapping reservations on any member."
                    : "None, because the group is inactive."}
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {group.blocks.map((b) => (
                    <li key={b.id} className="text-charcoal/65 text-[12.5px]">
                      <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#FF5371] align-middle" />
                      <strong className="text-charcoal/80">{b.property.name}</strong> blocked{" "}
                      {formatDate(b.startDate)} → {formatDate(b.endDate)}
                      <span className="text-charcoal/45">
                        {" "}
                        — because {b.sourceProperty?.name ?? "a sibling"} is occupied
                        {b.sourceBookingId
                          ? ` (booking #${b.sourceBookingId})`
                          : b.sourceExternalEventId
                            ? " (imported event)"
                            : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
