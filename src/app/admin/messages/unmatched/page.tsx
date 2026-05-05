import Link from "next/link";
import { prisma } from "@/lib/prisma";
import UnmatchedInboundList from "@/components/admin/UnmatchedInboundList";

export const dynamic = "force-dynamic";

export default async function UnmatchedInboxPage() {
  const rows = await prisma.unmatchedInboundMessage.findMany({
    where: { resolvedAt: null },
    orderBy: { receivedAt: "desc" },
    take: 100,
  });

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <Link href="/admin/messages" className="text-forest text-[12.5px] font-semibold hover:underline inline-flex items-center gap-1.5 mb-3">
        <i className="fa-solid fa-chevron-left text-[10px]" /> Back to Messages
      </Link>
      <div className="mb-6">
        <h1 className="font-serif font-semibold text-charcoal text-[1.8rem]">Unmatched Inbox</h1>
        <p className="text-charcoal/45 text-[13px] mt-0.5">
          Inbound SMS replies whose phone number does not match any booking. Re-thread to a booking or dismiss.
        </p>
      </div>

      <UnmatchedInboundList initialRows={rows.map((r) => ({
        id: r.id,
        channel: r.channel,
        fromNumber: r.fromNumber,
        body: r.body,
        receivedAt: r.receivedAt.toISOString(),
      }))} />
    </div>
  );
}
