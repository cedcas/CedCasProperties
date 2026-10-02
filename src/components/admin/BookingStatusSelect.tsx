"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BookingStatusSelect({ id, status }: { id: number; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);

  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    const previous = value;
    setValue(newStatus);
    setError(null);
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      // The server refused (e.g. a cancelled booking whose dates have since been taken).
      // Show the real status again rather than one that was never saved.
      const body = await res.json().catch(() => ({}));
      const conflicts: { label: string; range: string }[] = body.conflicts ?? [];
      setValue(previous);
      setError(
        [body.error ?? "The status could not be changed.", ...conflicts.map((c) => `${c.label} (${c.range})`)].join(" ")
      );
      return;
    }
    router.refresh();
  };

  const color = value === "confirmed" ? "text-green-700 bg-green-50 border-green-200"
    : value === "cancelled" ? "text-red-600 bg-red-50 border-red-200"
    : "text-amber-700 bg-amber-50 border-amber-200";

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <select value={value} onChange={handleChange} aria-label="Booking status"
        className={`text-[12px] font-semibold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none ${color}`}>
        <option value="pending">pending</option>
        <option value="confirmed">confirmed</option>
        <option value="cancelled">cancelled</option>
      </select>
      {error && (
        <span role="alert" className="text-[12px] text-red-700 max-w-[320px] text-right">
          {error}
        </span>
      )}
    </span>
  );
}
