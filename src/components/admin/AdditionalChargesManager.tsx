"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { buildChargeSms } from "@/lib/charge-message";

const CARD_MULTIPLIER = 1.06; // base + 6% card fee

export interface ChargeView {
  id: number;
  description: string;
  amount: number;
  token: string;
  status: string; // pending | awaiting_verification | paid | cancelled
  paymentMethod: string | null;
  notifiedAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface Props {
  bookingId: number;
  guestName: string;
  initialCharges: ChargeView[];
}

const peso = (n: number) => `₱${Number(n).toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  awaiting_verification: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Unpaid",
  awaiting_verification: "Awaiting verification",
  paid: "Paid",
  cancelled: "Cancelled",
};

export default function AdditionalChargesManager({ bookingId, guestName, initialCharges }: Props) {
  const router = useRouter();
  const [charges, setCharges] = useState<ChargeView[]>(initialCharges);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null); // `${id}-link` | `${id}-sms`
  const [toast, setToast] = useState("");

  const urlFor = (token: string) =>
    typeof window !== "undefined" ? `${window.location.origin}/pay/${token}` : `/pay/${token}`;

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2500);
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const amt = parseFloat(amount);
    if (!description.trim() || !amt || amt <= 0) {
      setError("Enter a description and an amount greater than 0.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/charges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, description: description.trim(), amount: amt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create charge");
      const c = data.charge;
      setCharges((prev) => [
        {
          id: c.id,
          description: c.description,
          amount: Number(c.amount),
          token: c.token,
          status: c.status,
          paymentMethod: c.paymentMethod,
          notifiedAt: c.notifiedAt,
          paidAt: c.paidAt,
          createdAt: c.createdAt,
        },
        ...prev,
      ]);
      setDescription("");
      setAmount("");
      flash(data.notified ? "Charge created — guest emailed." : "Charge created (email failed — use Resend).");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating charge");
    } finally {
      setCreating(false);
    }
  };

  const patch = async (id: number, body: Record<string, unknown>, okMsg: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/charges/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      if (typeof data.status === "string") {
        setCharges((prev) => prev.map((c) => (c.id === id ? { ...c, status: data.status, paidAt: data.paidAt ?? c.paidAt } : c)));
      }
      flash(okMsg);
      router.refresh();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this charge? This cannot be undone.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/charges/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCharges((prev) => prev.filter((c) => c.id !== id));
        flash("Charge deleted.");
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  const inputCls =
    "w-full px-3 py-2 rounded-[8px] border border-black/10 text-[14px] text-gray-800 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/10";
  const labelCls = "text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block";

  return (
    <section className="bg-white rounded-[16px] p-6 shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04] mt-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-serif font-semibold text-charcoal text-[1rem]">Additional Charges</h2>
        {toast && <span className="text-[12px] text-forest font-medium">{toast}</span>}
      </div>
      <p className="text-charcoal/45 text-[12.5px] mb-5">
        Bill the guest for early check-in, late check-out, extra cleaning, damages or incidentals. They get a secure
        pay-by-link (GCash, BPI, or card). Card adds a 6% fee.
      </p>

      {/* Add form */}
      <form onSubmit={create} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-3 items-end mb-6">
        <div>
          <label className={labelCls}>Reason</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Early check-in (10am)"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Amount (₱)</label>
          <input
            type="number"
            min={1}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="500"
            className={inputCls}
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="px-5 py-2 bg-forest text-white rounded-[8px] text-[14px] font-semibold hover:bg-forest/90 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {creating ? "Creating…" : "Create & email"}
        </button>
      </form>
      {error && <p className="text-red-600 text-[13px] -mt-3 mb-4">{error}</p>}

      {/* List */}
      {charges.length === 0 ? (
        <p className="text-charcoal/35 text-[13px]">No additional charges yet.</p>
      ) : (
        <ul className="divide-y divide-black/[.06]">
          {charges.map((c) => {
            const cardTotal = c.amount * CARD_MULTIPLIER;
            const active = c.status !== "paid" && c.status !== "cancelled";
            return (
              <li key={c.id} className="py-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-charcoal text-[14px]">{c.description}</span>
                    <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[c.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                    {c.paymentMethod && (
                      <span className="text-[11px] text-charcoal/45 uppercase">{c.paymentMethod}</span>
                    )}
                  </div>
                  <p className="text-[13px] text-charcoal/60 mt-0.5">
                    {peso(c.amount)} <span className="text-charcoal/35">· {peso(cardTotal)} by card</span>
                  </p>
                  <p className="text-[11px] text-charcoal/35 mt-0.5">
                    Created {new Date(c.createdAt).toLocaleDateString("en-PH")}
                    {c.notifiedAt ? " · guest emailed" : " · not emailed"}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <button
                    onClick={() => copy(urlFor(c.token), `${c.id}-link`)}
                    className="text-[12px] font-semibold text-forest border border-forest/30 rounded-full px-3 py-1.5 hover:bg-forest/5 transition-colors"
                  >
                    <i className={`fa-solid ${copied === `${c.id}-link` ? "fa-check" : "fa-link"} mr-1`} />
                    {copied === `${c.id}-link` ? "Copied" : "Copy link"}
                  </button>
                  <button
                    onClick={() =>
                      copy(buildChargeSms({ guestName, amount: c.amount, description: c.description, url: urlFor(c.token) }), `${c.id}-sms`)
                    }
                    className="text-[12px] font-semibold text-forest border border-forest/30 rounded-full px-3 py-1.5 hover:bg-forest/5 transition-colors"
                  >
                    <i className={`fa-solid ${copied === `${c.id}-sms` ? "fa-check" : "fa-comment-sms"} mr-1`} />
                    {copied === `${c.id}-sms` ? "Copied" : "Copy SMS"}
                  </button>
                  {active && (
                    <>
                      <button
                        onClick={() => patch(c.id, { resend: true }, "Payment link re-sent.")}
                        disabled={busyId === c.id}
                        className="text-[12px] font-semibold text-charcoal/60 border border-black/10 rounded-full px-3 py-1.5 hover:bg-black/[.03] disabled:opacity-50 transition-colors"
                      >
                        <i className="fa-solid fa-paper-plane mr-1" /> Resend
                      </button>
                      <button
                        onClick={() => patch(c.id, { status: "paid" }, "Marked as paid.")}
                        disabled={busyId === c.id}
                        className="text-[12px] font-semibold text-white bg-forest rounded-full px-3 py-1.5 hover:bg-forest/90 disabled:opacity-50 transition-colors"
                      >
                        <i className="fa-solid fa-check mr-1" /> Mark paid
                      </button>
                      <button
                        onClick={() => patch(c.id, { status: "cancelled" }, "Charge cancelled.")}
                        disabled={busyId === c.id}
                        className="text-[12px] font-semibold text-amber-700 border border-amber-300 rounded-full px-3 py-1.5 hover:bg-amber-50 disabled:opacity-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => remove(c.id)}
                    disabled={busyId === c.id}
                    title="Delete charge"
                    className="text-red-400 hover:text-red-600 disabled:opacity-50 transition-colors text-[13px] px-1.5"
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
