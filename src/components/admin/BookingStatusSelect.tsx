"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BookingStatusSelect({ id, status }: { id: number; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setValue(newStatus);
    await fetch(`/api/admin/bookings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
  };

  const color = value === "confirmed" ? "text-green-700 bg-green-50 border-green-200"
    : value === "cancelled" ? "text-red-600 bg-red-50 border-red-200"
    : "text-amber-700 bg-amber-50 border-amber-200";

  return (
    <select value={value} onChange={handleChange}
      className={`text-[12px] font-semibold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none ${color}`}>
      <option value="pending">pending</option>
      <option value="confirmed">confirmed</option>
      <option value="cancelled">cancelled</option>
    </select>
  );
}
