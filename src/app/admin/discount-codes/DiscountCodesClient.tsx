"use client";
import { useState } from "react";
import type { DiscountCode } from "@prisma/client";

interface Props {
  initialCodes: DiscountCode[];
}

export default function DiscountCodesClient({ initialCodes }: Props) {
  const [codes, setCodes] = useState<DiscountCode[]>(initialCodes);
  const [form, setForm] = useState({ code: "", type: "percentage", value: "", maxUses: "" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/discount-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          type: form.type,
          value: parseFloat(form.value),
          maxUses: form.maxUses ? parseInt(form.maxUses) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create code");
      setCodes([data, ...codes]);
      setForm({ code: "", type: "percentage", value: "", maxUses: "" });
      setSuccess(`Promo code "${data.code}" created successfully.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating code");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (code: DiscountCode) => {
    const res = await fetch(`/api/admin/discount-codes/${code.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !code.isActive }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCodes(codes.map((c) => (c.id === updated.id ? updated : c)));
    }
  };

  const deleteCode = async (id: number) => {
    if (!confirm("Delete this promo code?")) return;
    const res = await fetch(`/api/admin/discount-codes/${id}`, { method: "DELETE" });
    if (res.ok) setCodes(codes.filter((c) => c.id !== id));
  };

  const inputCls = "w-full px-3 py-2 rounded-[8px] border border-black/10 text-[14px] text-gray-800 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/10";
  const labelCls = "text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block";

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-[1.6rem] font-serif font-semibold text-charcoal">Discount Codes</h1>
        <p className="text-gray-500 text-[14px] mt-1">Create and manage promo codes. Discounts apply to nightly rates only — not to Stripe transaction fees.</p>
      </div>

      {/* Create form */}
      <div className="bg-white rounded-[16px] p-6 border border-black/[.08] shadow-sm mb-8">
        <h2 className="font-semibold text-charcoal mb-4">Create New Code</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>Code *</label>
            <input
              type="text"
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="WELCOME10"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Type *</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed (₱)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Value *</label>
            <input
              type="number"
              required
              min={0.01}
              step={0.01}
              max={form.type === "percentage" ? 100 : undefined}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              placeholder={form.type === "percentage" ? "10" : "500"}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Max Uses</label>
            <input
              type="number"
              min={1}
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
              placeholder="Unlimited"
              className={inputCls}
            />
          </div>
          <div className="col-span-2 sm:col-span-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 bg-forest text-white rounded-[8px] text-[14px] font-semibold hover:bg-forest/90 disabled:opacity-50 transition-colors"
            >
              {creating ? "Creating…" : "Create Code"}
            </button>
            {error && <p className="text-red-600 text-[13px]">{error}</p>}
            {success && <p className="text-green-600 text-[13px]">{success}</p>}
          </div>
        </form>
      </div>

      {/* Codes list */}
      <div className="bg-white rounded-[16px] border border-black/[.08] shadow-sm overflow-hidden">
        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b border-black/[.06] bg-gray-50">
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Code</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Value</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Uses</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {codes.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400 text-[13px]">No promo codes yet.</td></tr>
            )}
            {codes.map((code) => (
              <tr key={code.id} className="border-b border-black/[.04] last:border-none hover:bg-gray-50/50">
                <td className="px-5 py-4 font-mono font-bold text-forest">{code.code}</td>
                <td className="px-4 py-4 text-gray-600 capitalize">{code.type}</td>
                <td className="px-4 py-4 font-semibold text-charcoal">
                  {code.type === "percentage" ? `${Number(code.value)}%` : `₱${Number(code.value).toLocaleString()}`}
                </td>
                <td className="px-4 py-4 text-gray-500">
                  {code.usageCount}{code.maxUses !== null ? ` / ${code.maxUses}` : ""}
                </td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => toggleActive(code)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${code.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                  >
                    {code.isActive ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-4 text-right">
                  <button onClick={() => deleteCode(code.id)} className="text-red-400 hover:text-red-600 transition-colors text-[13px]">
                    <i className="fa-solid fa-trash" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
