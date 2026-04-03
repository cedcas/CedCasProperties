"use client";
import { useState } from "react";

interface RateEntry {
  id: number;
  rateType: string;
  dayOfWeek: number | null;
  specificDate: string | null;
  rate: number;
  note: string | null;
}

interface Props {
  propertyId: number;
  defaultRate: number;
  initialRates: RateEntry[];
}

export default function PropertyRatesClient({ propertyId, defaultRate, initialRates }: Props) {
  const [rates, setRates] = useState<RateEntry[]>(initialRates);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Weekday/weekend forms
  const [weekdayRate, setWeekdayRate] = useState(() => String(rates.find((r) => r.rateType === "weekday")?.rate ?? ""));
  const [weekendRate, setWeekendRate] = useState(() => String(rates.find((r) => r.rateType === "weekend")?.rate ?? ""));

  // Override form
  const [overrideForm, setOverrideForm] = useState({ specificDate: "", rate: "", note: "" });

  const inputCls = "w-full px-3 py-2 rounded-[8px] border border-black/10 text-[14px] text-gray-800 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/10";
  const labelCls = "text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block";

  const saveRate = async (rateType: string, rate: string) => {
    if (!rate || isNaN(Number(rate))) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/properties/${propertyId}/rates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rateType, rate: Number(rate) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save rate");
      setRates((prev) => {
        const filtered = prev.filter((r) => r.rateType !== rateType);
        return [...filtered, { ...data, rate: Number(data.rate), specificDate: null }];
      });
      setSuccess(`${rateType.charAt(0).toUpperCase() + rateType.slice(1)} rate saved.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving rate");
    } finally {
      setSaving(false);
    }
  };

  const saveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideForm.specificDate || !overrideForm.rate) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/properties/${propertyId}/rates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rateType: "override",
          specificDate: overrideForm.specificDate,
          rate: Number(overrideForm.rate),
          note: overrideForm.note || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save override");
      setRates((prev) => [...prev, { ...data, rate: Number(data.rate), specificDate: overrideForm.specificDate }]);
      setOverrideForm({ specificDate: "", rate: "", note: "" });
      setSuccess("Date override saved.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving override");
    } finally {
      setSaving(false);
    }
  };

  const deleteRate = async (rateId: number) => {
    if (!confirm("Remove this rate?")) return;
    const res = await fetch(`/api/admin/properties/${propertyId}/rates`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rateId }),
    });
    if (res.ok) setRates(rates.filter((r) => r.id !== rateId));
  };

  const overrides = rates.filter((r) => r.rateType === "override").sort((a, b) =>
    (a.specificDate ?? "").localeCompare(b.specificDate ?? "")
  );

  return (
    <div className="space-y-6">
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-[8px] text-[13px] text-red-700">{error}</div>}
      {success && <div className="p-3 bg-green-50 border border-green-200 rounded-[8px] text-[13px] text-green-700">{success}</div>}

      {/* Weekday/Weekend rates */}
      <div className="bg-white rounded-[16px] p-6 border border-black/[.08] shadow-sm">
        <h2 className="font-semibold text-charcoal mb-1">Weekday &amp; Weekend Rates</h2>
        <p className="text-gray-400 text-[13px] mb-5">Mon–Fri = weekday, Sat–Sun = weekend. Leave blank to use the default rate (₱{defaultRate.toLocaleString()}/night).</p>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Weekday Rate (₱)</label>
            <div className="flex gap-2">
              <input type="number" min={0} step={1} value={weekdayRate} onChange={(e) => setWeekdayRate(e.target.value)} placeholder={String(defaultRate)} className={inputCls} />
              <button type="button" disabled={saving} onClick={() => saveRate("weekday", weekdayRate)}
                className="px-4 py-2 bg-forest text-white rounded-[8px] text-[13px] font-semibold disabled:opacity-50 hover:bg-forest/90 whitespace-nowrap">
                Save
              </button>
            </div>
            {rates.find((r) => r.rateType === "weekday") && (
              <button type="button" onClick={() => deleteRate(rates.find((r) => r.rateType === "weekday")!.id)}
                className="text-[12px] text-red-400 hover:text-red-600 mt-1">
                <i className="fa-solid fa-xmark mr-1" />Remove weekday rate (use default)
              </button>
            )}
          </div>
          <div>
            <label className={labelCls}>Weekend Rate (₱)</label>
            <div className="flex gap-2">
              <input type="number" min={0} step={1} value={weekendRate} onChange={(e) => setWeekendRate(e.target.value)} placeholder={String(defaultRate)} className={inputCls} />
              <button type="button" disabled={saving} onClick={() => saveRate("weekend", weekendRate)}
                className="px-4 py-2 bg-forest text-white rounded-[8px] text-[13px] font-semibold disabled:opacity-50 hover:bg-forest/90 whitespace-nowrap">
                Save
              </button>
            </div>
            {rates.find((r) => r.rateType === "weekend") && (
              <button type="button" onClick={() => deleteRate(rates.find((r) => r.rateType === "weekend")!.id)}
                className="text-[12px] text-red-400 hover:text-red-600 mt-1">
                <i className="fa-solid fa-xmark mr-1" />Remove weekend rate (use default)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Date overrides */}
      <div className="bg-white rounded-[16px] p-6 border border-black/[.08] shadow-sm">
        <h2 className="font-semibold text-charcoal mb-1">Date Overrides</h2>
        <p className="text-gray-400 text-[13px] mb-5">Set a custom rate for a specific date (overrides weekday/weekend rules).</p>

        <form onSubmit={saveOverride} className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <label className={labelCls}>Date *</label>
            <input type="date" required value={overrideForm.specificDate}
              onChange={(e) => setOverrideForm({ ...overrideForm, specificDate: e.target.value })}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Rate (₱) *</label>
            <input type="number" required min={0} step={1} value={overrideForm.rate}
              onChange={(e) => setOverrideForm({ ...overrideForm, rate: e.target.value })}
              placeholder="e.g. 5000" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Note (optional)</label>
            <input type="text" value={overrideForm.note}
              onChange={(e) => setOverrideForm({ ...overrideForm, note: e.target.value })}
              placeholder="e.g. Holiday rate" className={inputCls} />
          </div>
          <div className="col-span-3">
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-forest text-white rounded-[8px] text-[14px] font-semibold hover:bg-forest/90 disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : "Add Date Override"}
            </button>
          </div>
        </form>

        {/* Override list */}
        {overrides.length === 0 ? (
          <p className="text-gray-400 text-[13px]">No date overrides yet.</p>
        ) : (
          <div className="border border-black/[.06] rounded-[10px] overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-gray-50 border-b border-black/[.06]">
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Rate</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Note</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {overrides.map((r) => (
                  <tr key={r.id} className="border-b border-black/[.04] last:border-none hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-charcoal">
                      {r.specificDate ? new Date(r.specificDate + "T12:00:00").toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-4 py-3 font-bold text-forest">₱{r.rate.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500">{r.note ?? "—"}</td>
                    <td className="px-3 py-3 text-right">
                      <button onClick={() => deleteRate(r.id)} className="text-red-400 hover:text-red-600 transition-colors">
                        <i className="fa-solid fa-trash text-[12px]" />
                      </button>
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
