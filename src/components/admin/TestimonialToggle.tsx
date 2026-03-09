"use client";
import { useRouter } from "next/navigation";

export default function TestimonialToggle({ id, isActive }: { id: number; isActive: boolean }) {
  const router = useRouter();

  const toggle = async () => {
    await fetch(`/api/admin/testimonials/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    router.refresh();
  };

  return (
    <button onClick={toggle} className={`text-[12px] font-semibold hover:underline ${isActive ? "text-charcoal/40" : "text-forest"}`}>
      {isActive ? "Hide" : "Show"}
    </button>
  );
}
