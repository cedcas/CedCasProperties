import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { groupCustomers } from "@/lib/customers";
import { formatStayDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: { property: { select: { name: true } } },
  });

  const customers = groupCustomers(bookings);

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif font-semibold text-charcoal text-[1.8rem]">Customers</h1>
        <p className="text-charcoal/45 text-[14px] mt-1">{customers.length} customer{customers.length !== 1 ? "s" : ""} · grouped by email or phone</p>
      </div>

      <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04] overflow-hidden">
        {customers.length === 0 ? (
          <div className="py-20 text-center">
            <i className="fa-solid fa-address-book text-charcoal/20 text-[3rem] mb-4 block" />
            <p className="text-charcoal/40 text-[15px]">No customers yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-black/[.06] bg-[#F8F9FA]">
                  {["Customer", "Phone", "Bookings", "Total Spent", "Last Stay", ""].map((h) => (
                    <th key={h} className="text-left px-5 py-3.5 text-[11px] font-semibold text-charcoal/50 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[.05]">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/admin/customers/${c.id}`} className="group">
                        <div className="font-medium text-charcoal text-[14px] group-hover:text-forest transition-colors">{c.name}</div>
                        <div className="text-charcoal/40 text-[12px] break-all">{c.email}</div>
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-[13px] text-charcoal/70">{c.phone || <span className="text-charcoal/30">—</span>}</td>
                    <td className="px-5 py-4 text-[13px] text-charcoal/70 text-center">{c.bookingCount}</td>
                    <td className="px-5 py-4 text-[13px] font-semibold text-charcoal">₱{c.totalSpent.toLocaleString()}</td>
                    <td className="px-5 py-4 text-[12px] text-charcoal/60">{formatStayDate(c.lastStay, { year: "numeric", month: "short", day: "numeric" })}</td>
                    <td className="px-5 py-4">
                      <Link href={`/admin/customers/${c.id}`} className="text-[12px] font-semibold text-forest hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
