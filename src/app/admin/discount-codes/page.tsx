import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DiscountCodesClient from "./DiscountCodesClient";

export const dynamic = "force-dynamic";

export default async function DiscountCodesPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const codes = await prisma.discountCode.findMany({
    orderBy: { createdAt: "desc" },
  });

  return <DiscountCodesClient initialCodes={codes} />;
}
