"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteButton({ id, type }: { id: number; type: "property" | "booking" | "message" | "testimonial" }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const urlMap = {
    property:    `/api/admin/properties/${id}`,
    booking:     `/api/admin/bookings/${id}`,
    message:     `/api/admin/messages/${id}`,
    testimonial: `/api/admin/testimonials/${id}`,
  };

  const handleDelete = async () => {
    await fetch(urlMap[type], { method: "DELETE" });
    router.refresh();
  };

  if (confirming) {
    return (
      <span className="flex items-center gap-1.5">
        <button onClick={handleDelete} className="text-[12px] font-semibold text-red-600 hover:underline">Confirm</button>
        <span className="text-charcoal/20">|</span>
        <button onClick={() => setConfirming(false)} className="text-[12px] text-charcoal/45 hover:underline">Cancel</button>
      </span>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} className="text-[12px] font-semibold text-red-500 hover:underline">
      Delete
    </button>
  );
}
