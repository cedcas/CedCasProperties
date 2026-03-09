"use client";
import { useRouter } from "next/navigation";

export default function MarkReadButton({ id, isRead }: { id: number; isRead: boolean }) {
  const router = useRouter();

  const toggle = async () => {
    await fetch(`/api/admin/messages/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRead: !isRead }),
    });
    router.refresh();
  };

  return (
    <button onClick={toggle} className={`text-[12px] font-semibold hover:underline ${isRead ? "text-charcoal/40" : "text-forest"}`}>
      {isRead ? "Mark Unread" : "Mark Read"}
    </button>
  );
}
