import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import InventoryGroupsClient from "./InventoryGroupsClient";

export const dynamic = "force-dynamic";

export default async function InventoryGroupsPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-10">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin/properties"
          className="text-charcoal/40 hover:text-charcoal text-[13px] transition-colors"
        >
          <i className="fa-solid fa-arrow-left mr-1" /> Properties
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-charcoal font-serif text-[1.8rem] font-semibold">
          Shared Inventory Groups
        </h1>
        <p className="text-charcoal/45 mt-1 max-w-3xl text-[14px]">
          Group listings that are different configurations of the{" "}
          <strong>same physical property</strong> — for example a 1-bedroom, 2-bedroom and 3-bedroom
          version of one unit. When one configuration is reserved, the others are automatically
          blocked for the same nights, on this site and on every connected channel.
        </p>
      </div>

      <InventoryGroupsClient />
    </div>
  );
}
