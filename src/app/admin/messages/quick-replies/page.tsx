import { prisma } from "@/lib/prisma";
import QuickRepliesManager from "@/components/admin/QuickRepliesManager";

export const dynamic = "force-dynamic";

export default async function QuickRepliesPage() {
  const [replies, properties] = await Promise.all([
    prisma.quickReply.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: { property: { select: { id: true, name: true, type: true } } },
    }),
    prisma.property.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
  ]);

  return (
    <QuickRepliesManager
      initialReplies={replies.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }))}
      properties={properties}
    />
  );
}
