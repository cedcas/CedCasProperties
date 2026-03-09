import { prisma } from "@/lib/prisma";
import DeleteButton from "@/components/admin/DeleteButton";
import MarkReadButton from "@/components/admin/MarkReadButton";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" } });
  const unread = messages.filter((m) => !m.isRead).length;

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif font-semibold text-charcoal text-[1.8rem]">Messages</h1>
        <p className="text-charcoal/45 text-[14px] mt-1">{unread} unread · {messages.length} total</p>
      </div>

      <div className="flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="bg-white rounded-[16px] py-20 text-center shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04]">
            <i className="fa-solid fa-inbox text-charcoal/20 text-[3rem] mb-4 block" />
            <p className="text-charcoal/40 text-[15px]">No messages yet.</p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`bg-white rounded-[16px] p-6 shadow-[0_2px_12px_rgba(44,44,44,.07)] border ${!m.isRead ? "border-amber-300 bg-amber-50/30" : "border-black/[.04]"}`}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-charcoal text-[15px]">{m.name}</span>
                    {!m.isRead && <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wide">New</span>}
                  </div>
                  <div className="text-[13px] text-charcoal/50 mt-0.5">{m.email} · {m.phone}</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[11px] text-charcoal/35">{new Date(m.createdAt).toLocaleDateString()}</span>
                  <MarkReadButton id={m.id} isRead={m.isRead} />
                  <DeleteButton id={m.id} type="message" />
                </div>
              </div>
              <div className="text-[13px] font-semibold text-forest mb-2">{m.subject}</div>
              <p className="text-[13.5px] text-charcoal/65 leading-[1.65] whitespace-pre-wrap">{m.message}</p>
              <div className="mt-4 pt-3 border-t border-black/[.06]">
                <a href={`mailto:${m.email}?subject=Re: ${m.subject}`}
                  className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-forest hover:underline">
                  <i className="fa-solid fa-reply text-[11px]" /> Reply via Email
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
