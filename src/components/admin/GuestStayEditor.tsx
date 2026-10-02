"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatStayDate } from "@/lib/dates";
import type {
  AmendableField,
  AmendmentResult,
  AmendmentReview,
  BookingSnapshot,
  ConflictSummary,
  FieldErrors,
} from "@/lib/booking-amendment";

/**
 * Guest & Stay sections of the booking detail page, with an Edit → Review → Save flow.
 *
 * Nothing is written until "Save amendment": "Review changes" asks the server to validate
 * the change and describe its effect (availability, sibling listings, price, reminders),
 * and the save re-checks all of it. The server is the authority throughout — this
 * component only collects input and shows what came back.
 */

export interface EditorProperty {
  id: number;
  name: string;
  maxGuests: number;
}

type Mode = "view" | "edit" | "review";
type FormState = Record<AmendableField, string>;

const REASON_MIN = 5;

const peso = (v: number) => `₱${v.toLocaleString("en-PH")}`;

/** A message send time is an instant — shown in property time, labelled as such. */
const manilaTime = (iso: string) =>
  `${new Date(iso).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })} (Manila)`;

function nightsOf(checkIn: string, checkOut: string): number {
  return Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86_400_000);
}

function nextDay(key: string): string {
  const t = Date.parse(`${key}T00:00:00Z`);
  return isNaN(t) ? "" : new Date(t + 86_400_000).toISOString().slice(0, 10);
}

const toForm = (s: BookingSnapshot): FormState => ({
  guestName: s.guestName,
  guestEmail: s.guestEmail,
  guestPhone: s.guestPhone,
  guests: String(s.guests),
  propertyId: String(s.propertyId),
  checkIn: s.checkIn,
  checkOut: s.checkOut,
});

export default function GuestStayEditor({
  bookingId,
  snapshot,
  propertyName,
  propertySlug,
  properties,
  editable,
  notice,
  canEdit,
  guestFooter,
  stayFooter,
}: {
  bookingId: number;
  snapshot: BookingSnapshot;
  propertyName: string;
  propertySlug: string;
  properties: EditorProperty[];
  editable: AmendableField[];
  notice: string | null;
  canEdit: boolean;
  guestFooter?: React.ReactNode;
  stayFooter?: React.ReactNode;
}) {
  const router = useRouter();
  const uid = useId();
  const [mode, setMode] = useState<Mode>("view");
  const [form, setForm] = useState<FormState>(() => toForm(snapshot));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ConflictSummary[]>([]);
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<AmendmentReview | null>(null);
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<AmendmentResult | null>(null);
  const [resyncing, setResyncing] = useState(false);

  const editButtonRef = useRef<HTMLButtonElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const focusOnMode = useRef(false);

  // Move focus with the step, so keyboard and screen-reader users land where the flow is.
  useEffect(() => {
    if (!focusOnMode.current) return;
    focusOnMode.current = false;
    if (mode === "edit") firstFieldRef.current?.focus();
    else if (mode === "review") reviewHeadingRef.current?.focus();
    else editButtonRef.current?.focus();
  }, [mode]);

  const go = (next: Mode) => {
    focusOnMode.current = true;
    setMode(next);
  };

  const can = (f: AmendableField) => editable.includes(f);
  const set = (f: AmendableField, v: string) => {
    setForm((prev) => ({ ...prev, [f]: v }));
    setFieldErrors((prev) => ({ ...prev, [f]: undefined }));
  };

  /** Only fields the admin actually changed are sent; the server allowlists them again. */
  const changedFields = (): Partial<Record<AmendableField, string | number>> => {
    const original = toForm(snapshot);
    const out: Partial<Record<AmendableField, string | number>> = {};
    for (const f of editable) {
      const value = form[f].trim();
      if (value === original[f]) continue;
      out[f] = value;
    }
    return out;
  };

  const startEdit = () => {
    setForm(toForm(snapshot));
    setFieldErrors({});
    setError(null);
    setConflicts([]);
    setStale(false);
    setResult(null);
    setReview(null);
    setReason("");
    go("edit");
  };

  const cancel = () => {
    setForm(toForm(snapshot));
    setFieldErrors({});
    setError(null);
    setConflicts([]);
    setReview(null);
    setReason("");
    go("view");
  };

  const call = async (payload: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/bookings/${bookingId}/amend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body };
  };

  const showFailure = (body: {
    error?: string;
    code?: string;
    fieldErrors?: FieldErrors;
    conflicts?: ConflictSummary[];
  }) => {
    setError(body.error ?? "Something went wrong. Please try again.");
    setConflicts(body.conflicts ?? []);
    setStale(body.code === "stale");
    const onFields = Object.keys(body.fieldErrors ?? {}).some((k) => k !== "reason");
    setFieldErrors(body.fieldErrors ?? {});
    if (onFields) go("edit");
    else setTimeout(() => errorRef.current?.focus(), 0);
  };

  const requestReview = async () => {
    const changes = changedFields();
    setError(null);
    setConflicts([]);
    if (Object.keys(changes).length === 0) {
      setError("Nothing has changed yet.");
      setTimeout(() => errorRef.current?.focus(), 0);
      return;
    }
    setBusy(true);
    try {
      const { ok, body } = await call({ action: "preview", changes });
      if (!ok) return showFailure(body);
      setReview(body.review);
      setFieldErrors({});
      go("review");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!review) return;
    if (reason.trim().length < REASON_MIN) {
      setFieldErrors({ reason: `Enter a reason (at least ${REASON_MIN} characters).` });
      document.getElementById(`${uid}-reason`)?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    setConflicts([]);
    try {
      const { ok, body } = await call({
        action: "commit",
        changes: changedFields(),
        reason: reason.trim(),
        expectedUpdatedAt: review.expectedUpdatedAt,
        pricing: "preserve",
      });
      if (!ok) return showFailure(body);
      setResult(body as AmendmentResult);
      setReview(null);
      setReason("");
      go("view");
      router.refresh();
    } catch {
      // The request may or may not have been applied — never claim either.
      setError(
        "The connection dropped while saving, so the outcome is unknown. Reload the booking to see whether the amendment was applied before trying again."
      );
      setStale(true);
    } finally {
      setBusy(false);
    }
  };

  const resync = async () => {
    setResyncing(true);
    try {
      const { ok, body } = await call({ action: "resync" });
      if (ok && body.verified && result) {
        setResult({ ...result, outcome: "applied", propagation: { ...result.propagation, verified: true } });
        router.refresh();
      } else if (!ok) {
        setError(body.error ?? "Propagation could not be re-run. Try again.");
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setResyncing(false);
    }
  };

  const nights = nightsOf(snapshot.checkIn, snapshot.checkOut);
  const draftNights = nightsOf(form.checkIn, form.checkOut);
  const selected = properties.find((p) => String(p.id) === form.propertyId);

  const card = "bg-white rounded-[16px] p-6 shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04]";
  const primaryBtn =
    "min-h-[44px] px-5 rounded-full bg-forest text-white text-[13.5px] font-semibold hover:bg-forest/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
  const secondaryBtn =
    "min-h-[44px] px-5 rounded-full border border-charcoal/20 text-charcoal text-[13.5px] font-semibold hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:opacity-50 transition-colors";

  const editButton = (ref?: React.Ref<HTMLButtonElement>) =>
    canEdit && editable.length > 0 && mode === "view" ? (
      <button
        ref={ref}
        type="button"
        onClick={startEdit}
        className="min-h-[44px] -my-2.5 px-3 text-[12.5px] font-semibold text-forest hover:underline focus-visible:outline-2 focus-visible:outline-forest rounded-[8px]"
      >
        <i className="fa-solid fa-pen text-[11px] mr-1.5" aria-hidden="true" />
        Edit<span className="sr-only"> guest and stay details</span>
      </button>
    ) : null;

  const field = (
    name: AmendableField,
    label: string,
    input: (props: {
      id: string;
      "aria-invalid": boolean;
      "aria-describedby": string | undefined;
      className: string;
    }) => React.ReactNode,
    hint?: string
  ) => {
    const id = `${uid}-${name}`;
    const err = fieldErrors[name];
    const describedBy = [err ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
    return (
      <div>
        <label htmlFor={id} className="block text-[12px] font-semibold text-charcoal/60 mb-1.5">
          {label}
        </label>
        {input({
          id,
          "aria-invalid": Boolean(err),
          "aria-describedby": describedBy,
          className: `w-full min-h-[44px] px-3.5 rounded-[10px] bg-cream/60 border text-[16px] sm:text-[14px] text-charcoal focus:outline-none focus:bg-white focus:border-forest ${err ? "border-red-500" : "border-charcoal/15"}`,
        })}
        {hint && (
          <p id={`${id}-hint`} className="text-[11.5px] text-charcoal/50 mt-1">
            {hint}
          </p>
        )}
        {err && (
          <p id={`${id}-error`} role="alert" className="text-[12px] text-red-700 mt-1">
            {err}
          </p>
        )}
      </div>
    );
  };

  const locked = (label: string, value: React.ReactNode) => (
    <Row label={label} value={<>{value} <span className="text-[11px] text-charcoal/40">· locked</span></>} />
  );

  const errorBox = (error || conflicts.length > 0) && (
    <div
      ref={errorRef}
      tabIndex={-1}
      role="alert"
      className="lg:col-span-2 rounded-[12px] border border-red-300 bg-red-50 px-4 py-3 text-[13.5px] text-red-800 focus:outline-none"
    >
      <p className="font-semibold">{error}</p>
      {conflicts.length > 0 && (
        <ul className="mt-2 list-disc pl-5 space-y-0.5">
          {conflicts.map((c, i) => (
            <li key={i}>
              {c.label} <span className="text-red-700/70">({c.range})</span>
            </li>
          ))}
        </ul>
      )}
      {stale && (
        <button type="button" onClick={() => window.location.reload()} className={`${secondaryBtn} mt-3 bg-white`}>
          Reload booking
        </button>
      )}
    </div>
  );

  // ── Review step ──────────────────────────────────────────────────────────
  if (mode === "review" && review) {
    const fin = review.financial;
    const ref = fin.reference;
    const msgs = review.messages;
    const blocked = review.conflicts.length > 0;
    const anyMessages =
      msgs &&
      msgs.reschedule.length + msgs.withdraw.length + msgs.create.length + msgs.held.length + msgs.alreadySent.length + msgs.inFlight.length + msgs.notReplayed.length > 0;

    return (
      <>
        {errorBox}
        <section aria-labelledby={`${uid}-review`} className={`${card} lg:col-span-2`}>
          <h2
            id={`${uid}-review`}
            ref={reviewHeadingRef}
            tabIndex={-1}
            className="font-serif font-semibold text-charcoal text-[1.15rem] focus:outline-none"
          >
            Review amendment
          </h2>
          <p className="text-[13px] text-charcoal/55 mt-1 mb-5">
            Booking #{review.bookingId} keeps its number, its <strong>{review.status}</strong> status and its history.
            Nothing is saved until you choose Save amendment.
          </p>

          <h3 className="text-[11px] font-semibold text-charcoal/50 uppercase tracking-wide mb-2">Changes</h3>
          <ul className="divide-y divide-black/[.06] border-y border-black/[.06]">
            {review.changes.map((c) => (
              <li key={c.field} className="py-3 grid grid-cols-1 sm:grid-cols-[130px_1fr_1fr] gap-x-4 gap-y-1 text-[13.5px]">
                <span className="font-semibold text-charcoal">{c.label}</span>
                <span className="text-charcoal/55 break-words">
                  <span className="text-[11px] uppercase tracking-wide text-charcoal/40 mr-1.5">Before</span>
                  {c.before}
                </span>
                <span className="text-charcoal break-words">
                  <span className="text-[11px] uppercase tracking-wide text-forest mr-1.5">After</span>
                  <strong>{c.after}</strong>
                </span>
              </li>
            ))}
          </ul>

          {review.stayChanged && (
            <div className="mt-5 text-[13.5px] text-charcoal/80 space-y-1.5">
              <h3 className="text-[11px] font-semibold text-charcoal/50 uppercase tracking-wide mb-2">Stay &amp; availability</h3>
              <p>
                Nights: {review.nights.before} → <strong>{review.nights.after}</strong>
              </p>
              <p>
                Property: <strong>{review.property.after.name}</strong>
                {review.property.before.id !== review.property.after.id && <> (was {review.property.before.name})</>}
              </p>
              {review.inventory.alsoBlocks.length > 0 && (
                <p>Shared inventory — these listings will be blocked for the new dates: {review.inventory.alsoBlocks.join(", ")}.</p>
              )}
              {review.inventory.releases.length > 0 && (
                <p>These listings will be released from this booking: {review.inventory.releases.join(", ")}.</p>
              )}
              {blocked ? (
                <div role="alert" className="mt-2 rounded-[10px] border border-red-300 bg-red-50 px-4 py-3 text-red-800">
                  <p className="font-semibold">These dates are not available, so this amendment cannot be saved.</p>
                  <ul className="mt-1.5 list-disc pl-5 space-y-0.5">
                    {review.conflicts.map((c, i) => (
                      <li key={i}>
                        {c.label} <span className="text-red-700/70">({c.range})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-green-700">
                  <i className="fa-solid fa-check mr-1.5" aria-hidden="true" />
                  The new dates are free. Availability is checked again when you save.
                </p>
              )}
              {review.channelNote && <p className="text-charcoal/60">{review.channelNote}</p>}
            </div>
          )}

          <div className="mt-5 text-[13.5px] text-charcoal/80 space-y-1.5">
            <h3 className="text-[11px] font-semibold text-charcoal/50 uppercase tracking-wide mb-2">Price</h3>
            <p>
              The agreed total of <strong>{peso(fin.stored.total)}</strong> is kept. Nothing is charged or refunded, and no
              additional charge is created or emailed to the guest.
            </p>
            {ref?.ok && (
              <p>
                For reference only: at today&apos;s rates the amended stay prices at {peso(ref.total)}
                {ref.difference === 0
                  ? " — the same as the agreed total."
                  : ref.difference > 0
                    ? ` — ${peso(ref.difference)} more than the agreed total.`
                    : ` — ${peso(-ref.difference)} less than the agreed total.`}{" "}
                {ref.difference !== 0 && "Any difference has to be settled with the guest separately."}
              </p>
            )}
            {ref && !ref.ok && <p className="text-charcoal/60">A reference price is not available: {ref.error}</p>}
            {fin.hasStripePayment && <p className="text-charcoal/60">The card payment record on this booking is not changed.</p>}
          </div>

          {anyMessages && msgs && (
            <div className="mt-5 text-[13.5px] text-charcoal/80">
              <h3 className="text-[11px] font-semibold text-charcoal/50 uppercase tracking-wide mb-2">Scheduled messages</h3>
              <ul className="space-y-1 list-disc pl-5">
                {msgs.reschedule.map((m, i) => (
                  <li key={`r${i}`}>
                    “{m.name}” moves from {manilaTime(m.from)} to {manilaTime(m.to)}.
                  </li>
                ))}
                {msgs.create.map((m, i) => (
                  <li key={`c${i}`}>
                    “{m.name}” will be scheduled for {manilaTime(m.sendAt)}.
                  </li>
                ))}
                {msgs.withdraw.map((m, i) => (
                  <li key={`w${i}`}>“{m.name}” will not be sent — it does not apply to the new listing.</li>
                ))}
                {msgs.held.map((m, i) => (
                  <li key={`h${i}`}>
                    “{m.name}” would have been due {manilaTime(m.wouldHaveSentAt)}, which has passed. It will{" "}
                    <strong>not</strong> be sent automatically — send it from the guest&apos;s thread if it is still needed.
                  </li>
                ))}
                {msgs.alreadySent.map((n, i) => (
                  <li key={`s${i}`}>“{n}” was already sent for the previous dates and will not be sent again.</li>
                ))}
                {msgs.inFlight.map((n, i) => (
                  <li key={`f${i}`}>
                    “{n}” is being sent right now and can no longer be changed. Check the guest&apos;s thread to see what
                    went out.
                  </li>
                ))}
                {msgs.notReplayed.map((n, i) => (
                  <li key={`n${i}`}>“{n}” is a confirmation message for the new listing and is not sent automatically.</li>
                ))}
              </ul>
              <p className="text-charcoal/60 mt-2">The guest is not notified of this amendment automatically.</p>
            </div>
          )}

          {review.warnings.length > 0 && (
            <div className="mt-5 rounded-[10px] border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
              <h3 className="font-semibold mb-1">Before you save</h3>
              <ul className="list-disc pl-5 space-y-1">
                {review.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6">
            <label htmlFor={`${uid}-reason`} className="block text-[12px] font-semibold text-charcoal/70 mb-1.5">
              Reason for this amendment <span className="text-red-700">(required)</span>
            </label>
            <textarea
              id={`${uid}-reason`}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setFieldErrors((p) => ({ ...p, reason: undefined }));
              }}
              rows={3}
              maxLength={500}
              required
              aria-required="true"
              aria-invalid={Boolean(fieldErrors.reason)}
              aria-describedby={`${uid}-reason-hint${fieldErrors.reason ? ` ${uid}-reason-error` : ""}`}
              placeholder="e.g. Guest asked by phone to stay one more night"
              className={`w-full px-3.5 py-2.5 rounded-[10px] bg-cream/60 border text-[16px] sm:text-[14px] text-charcoal focus:outline-none focus:bg-white focus:border-forest ${fieldErrors.reason ? "border-red-500" : "border-charcoal/15"}`}
            />
            <p id={`${uid}-reason-hint`} className="text-[11.5px] text-charcoal/50 mt-1">
              Recorded in the activity log with your name, the time and the before/after values. Not shown to the guest.
            </p>
            {fieldErrors.reason && (
              <p id={`${uid}-reason-error`} role="alert" className="text-[12px] text-red-700 mt-1">
                {fieldErrors.reason}
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:flex-wrap gap-3">
            <button type="button" onClick={save} disabled={busy || blocked} className={primaryBtn}>
              {busy ? "Saving…" : "Save amendment"}
            </button>
            <button type="button" onClick={() => go("edit")} disabled={busy} className={secondaryBtn}>
              Back to edit
            </button>
            <button type="button" onClick={cancel} disabled={busy} className={secondaryBtn}>
              Cancel
            </button>
          </div>
        </section>
      </>
    );
  }

  // ── View / Edit ──────────────────────────────────────────────────────────
  const editing = mode === "edit";

  return (
    <>
      {result && (
        <div
          role="status"
          className={`lg:col-span-2 rounded-[12px] border px-4 py-3 text-[13.5px] ${result.outcome === "applied" ? "border-green-300 bg-green-50 text-green-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}
        >
          {result.outcome === "applied" ? (
            <p>
              <strong>Amendment saved.</strong>{" "}
              {result.review.stayChanged
                ? "Availability and shared-inventory blocks are updated on this site. "
                : ""}
              {result.review.channelNote}
            </p>
          ) : (
            <>
              <p>
                <strong>The booking was amended, but its shared-inventory blocks are not fully updated yet.</strong>{" "}
                Dates may be blocked on more listings than necessary until this completes; none are left unprotected.
              </p>
              <button type="button" onClick={resync} disabled={resyncing} className={`${secondaryBtn} mt-3 bg-white`}>
                {resyncing ? "Retrying…" : "Retry propagation"}
              </button>
            </>
          )}
        </div>
      )}
      {mode !== "review" && errorBox}
      {notice && canEdit && (
        <p className="lg:col-span-2 text-[12.5px] text-charcoal/55 -mb-2">
          <i className="fa-solid fa-lock text-[11px] mr-1.5" aria-hidden="true" />
          {notice}
        </p>
      )}

      {/* Guest */}
      <section aria-labelledby={`${uid}-guest`} className={card}>
        <div className="flex items-center justify-between gap-3 mb-5">
          <h2 id={`${uid}-guest`} className="font-serif font-semibold text-charcoal text-[1rem]">
            Guest
          </h2>
          {editButton(editButtonRef)}
        </div>
        {editing ? (
          <div className="space-y-4">
            {can("guestName")
              ? field("guestName", "Name", (p) => (
                  <input {...p} ref={firstFieldRef} type="text" autoComplete="off" maxLength={120} value={form.guestName} onChange={(e) => set("guestName", e.target.value)} />
                ))
              : null}
            {can("guestEmail")
              ? field("guestEmail", "Email", (p) => (
                  <input {...p} type="email" inputMode="email" autoComplete="off" maxLength={254} value={form.guestEmail} onChange={(e) => set("guestEmail", e.target.value)} />
                ))
              : null}
            {can("guestPhone")
              ? field(
                  "guestPhone",
                  "Phone",
                  (p) => <input {...p} type="tel" inputMode="tel" autoComplete="off" value={form.guestPhone} onChange={(e) => set("guestPhone", e.target.value)} />,
                  "Philippine numbers like 09171234567, or international with a + prefix."
                )
              : null}
            {can("guests")
              ? field(
                  "guests",
                  "Guests",
                  (p) => <input {...p} type="number" inputMode="numeric" min={1} max={selected?.maxGuests} step={1} value={form.guests} onChange={(e) => set("guests", e.target.value)} />,
                  selected ? `${selected.name} accommodates up to ${selected.maxGuests}.` : undefined
                )
              : <dl className="text-[13.5px]">{locked("Guests", String(snapshot.guests))}</dl>}
          </div>
        ) : (
          <dl className="space-y-3 text-[13.5px]">
            <Row label="Name" value={snapshot.guestName} />
            <Row label="Email" value={<a href={`mailto:${snapshot.guestEmail}`} className="text-forest hover:underline break-all">{snapshot.guestEmail}</a>} />
            <Row label="Phone" value={snapshot.guestPhone ? <a href={`tel:${snapshot.guestPhone}`} className="text-forest hover:underline">{snapshot.guestPhone}</a> : <span className="text-charcoal/35">—</span>} />
            <Row label="Guests" value={String(snapshot.guests)} />
          </dl>
        )}
        {guestFooter}
      </section>

      {/* Stay */}
      <section aria-labelledby={`${uid}-stay`} className={card}>
        <div className="flex items-center justify-between gap-3 mb-5">
          <h2 id={`${uid}-stay`} className="font-serif font-semibold text-charcoal text-[1rem]">
            Stay
          </h2>
          {editButton()}
        </div>
        {editing ? (
          <div className="space-y-4">
            {can("propertyId") ? (
              field("propertyId", "Property", (p) => (
                <select {...p} value={form.propertyId} onChange={(e) => set("propertyId", e.target.value)}>
                  {properties.map((prop) => (
                    <option key={prop.id} value={prop.id}>
                      {prop.name} (up to {prop.maxGuests})
                    </option>
                  ))}
                </select>
              ))
            ) : (
              <dl className="text-[13.5px]">{locked("Property", propertyName)}</dl>
            )}
            {can("checkIn") ? (
              field("checkIn", "Check-in", (p) => (
                <input {...p} type="date" value={form.checkIn} onChange={(e) => set("checkIn", e.target.value)} />
              ))
            ) : (
              <dl className="text-[13.5px]">{locked("Check-in", formatStayDate(snapshot.checkIn))}</dl>
            )}
            {can("checkOut") ? (
              field("checkOut", "Check-out", (p) => (
                <input {...p} type="date" min={nextDay(form.checkIn) || undefined} value={form.checkOut} onChange={(e) => set("checkOut", e.target.value)} />
              ))
            ) : (
              <dl className="text-[13.5px]">{locked("Check-out", formatStayDate(snapshot.checkOut))}</dl>
            )}
            <p className="text-[13px] text-charcoal/60" aria-live="polite">
              {draftNights > 0 ? `${draftNights} night${draftNights !== 1 ? "s" : ""}` : "Check-out must be after check-in."}
            </p>
          </div>
        ) : (
          <dl className="space-y-3 text-[13.5px]">
            <Row label="Property" value={<Link href={`/properties/${propertySlug}`} className="text-forest hover:underline">{propertyName}</Link>} />
            <Row label="Check-in" value={formatStayDate(snapshot.checkIn)} />
            <Row label="Check-out" value={formatStayDate(snapshot.checkOut)} />
            <Row label="Nights" value={String(nights)} />
          </dl>
        )}
        {stayFooter}
      </section>

      {editing && (
        <div className="lg:col-span-2 flex flex-col-reverse sm:flex-row sm:flex-wrap gap-3">
          <button type="button" onClick={requestReview} disabled={busy} className={primaryBtn}>
            {busy ? "Checking…" : "Review changes"}
          </button>
          <button type="button" onClick={cancel} disabled={busy} className={secondaryBtn}>
            Cancel
          </button>
          <p className="text-[12.5px] text-charcoal/50 sm:self-center">Nothing is saved until you review and confirm.</p>
        </div>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-charcoal/45 flex-shrink-0">{label}</dt>
      <dd className="text-charcoal/80 text-right">{value}</dd>
    </div>
  );
}
