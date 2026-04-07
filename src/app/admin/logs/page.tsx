import { prisma } from "@/lib/prisma";
import LogsClient from "./LogsClient";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const [total, modules] = await Promise.all([
    prisma.adminLog.count(),
    prisma.adminLog.findMany({
      select: { module: true },
      distinct: ["module"],
    }),
  ]);

  const distinctModules = modules.map((m) => m.module);

  return <LogsClient total={total} modules={distinctModules} />;
}
