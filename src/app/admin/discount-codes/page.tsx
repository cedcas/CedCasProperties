import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DiscountCodesClient from "./DiscountCodesClient";

export const dynamic = "force-dynamic";

export default async function DiscountCodesPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const [codes, properties] = await Promise.all([
    prisma.discountCode.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.property.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return <DiscountCodesClient initialCodes={codes} properties={properties} />;
}
