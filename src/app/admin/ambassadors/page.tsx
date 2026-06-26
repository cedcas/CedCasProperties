import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AmbassadorsClient from "./AmbassadorsClient";

export const dynamic = "force-dynamic";

export default async function AmbassadorsPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const ambassadors = await prisma.ambassador.findMany({
    orderBy: { createdAt: "desc" },
  });

  return <AmbassadorsClient initialAmbassadors={ambassadors} />;
}
