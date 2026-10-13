"use client";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Approve / Decline for a booking request (status `requested`).
 * POSTs to /api/admin/bookings/[id]/request, which enforces the `bookings` permission and
 * re-checks availability before approving. Approval is permission to pay, not a hold.
 */
export default function BookingRequestActions({ id, noteMax }: { id: number; noteMax: number }) {
  const router = useRouter();
  const uid = useId();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const decide = async (action: "approve" | "decline") => {
    if (action === "decline" && !window.confirm("Decline this request? The guest is told by email and this cannot be undone.")) return;
    setBusy(action);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/bookings/${id}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note.trim() || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const conflicts: { label: string; range: string }[] = body.conflicts ?? [];
        setError(
          [body.error ?? "The request could not be updated.", ...conflicts.map((c) => `${c.label} (${c.range})`)].join(" ")
        );
        return;
      }
      setNotice(
        body.emailSent === false
          ? `Request ${body.status}, but the email to the guest could not be sent. Please contact the guest directly.`
          : `Request ${body.status}. The guest has been emailed.`
      );
      router.refresh();
    } catch {
      setError("The request could not be updated. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <label htmlFor={`${uid}-note`} className="block text-[11px] font-semibold text-charcoal/50 uppercase tracking-wide mb-1.5">
        Note (optional)
      </label>
      <textarea
        id={`${uid}-note`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={noteMax}
        rows={2}
        placeholder="Kept with the decision. If you decline, the guest sees this note."
        className="w-full rounded-[10px] border border-black/[.12] px-3.5 py-2.5 text-[13.5px] text-charcoal focus:outline-none focus:border-forest"
      />
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => decide("approve")}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
        >
          <i className={`fa-solid ${busy === "approve" ? "fa-spinner fa-spin" : "fa-check"}`} aria-hidden="true" />
          Approve and send payment link
        </button>
        <button
          type="button"
          onClick={() => decide("decline")}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-full border border-red-300 px-5 py-2.5 text-[13px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          <i className={`fa-solid ${busy === "decline" ? "fa-spinner fa-spin" : "fa-xmark"}`} aria-hidden="true" />
          Decline
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-[13px] text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-3 text-[13px] text-green-700">
          {notice}
        </p>
      )}
    </div>
  );
}
