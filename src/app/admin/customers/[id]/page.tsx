import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { findCustomerCluster, normEmail } from "@/lib/customers";
import { formatStayDate } from "@/lib/dates";
import NotesEditor from "@/components/admin/NotesEditor";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: { property: { select: { name: true } } },
  });

  const customer = findCustomerCluster(bookings, Number(id));
  if (!customer) notFound();

  const customerEmail = normEmail(customer.email);
  const customerNote = customerEmail
    ? await prisma.customerNote.findUnique({ where: { customerEmail } })
    : null;

  const stats = [
    { label: "Bookings", value: String(customer.bookingCount) },
    { label: "Total Spent", value: `₱${customer.totalSpent.toLocaleString()}` },
    { label: "First Seen", value: formatStayDate(customer.firstSeen, { year: "numeric", month: "short", day: "numeric" }) },
    { label: "Last Stay", value: formatStayDate(customer.lastStay, { year: "numeric", month: "short", day: "numeric" }) },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/customers" className="text-[12.5px] text-charcoal/45 hover:text-forest transition-colors inline-flex items-center gap-1.5">
          <i className="fa-solid fa-arrow-left text-[11px]" /> Back to Customers
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif font-semibold text-charcoal text-[1.8rem]">{customer.name}</h1>
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-[13.5px]">
          <a href={`mailto:${customer.email}`} className="text-forest hover:underline break-all"><i className="fa-solid fa-envelope text-[12px] mr-1.5" />{customer.email}</a>
          {customer.phone && <a href={`tel:${customer.phone}`} className="text-forest hover:underline"><i className="fa-solid fa-phone text-[12px] mr-1.5" />{customer.phone}</a>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-[16px] p-5 shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04]">
            <div className="font-bold text-charcoal text-[1.4rem] leading-none mb-1.5">{s.value}</div>
            <div className="text-charcoal/50 text-[12px]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Customer notes */}
      <section className="bg-white rounded-[16px] p-6 shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04] mb-8">
        <NotesEditor
          endpoint={`/api/admin/customers/${id}/note`}
          field="note"
          initialValue={customerNote?.note ?? null}
          label="Customer Comment / Notes"
          placeholder="Notes about this customer (e.g. preferences, guest review, VIP)…"
        />
      </section>

      {/* Bookings */}
      <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04] overflow-hidden">
        <div className="px-6 py-4 border-b border-black/[.06]">
          <h2 className="font-serif font-semibold text-charcoal text-[1rem]">Booking History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-black/[.06] bg-[#F8F9FA]">
                {["Property", "Dates", "Total", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-[11px] font-semibold text-charcoal/50 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[.05]">
              {customer.bookings.map((b) => (
                <tr key={b.id} className="hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-5 py-4 text-[13px] text-charcoal/70">{b.property.name}</td>
                  <td className="px-5 py-4 text-[12px] text-charcoal/60">
                    {formatStayDate(b.checkIn, { year: "numeric", month: "numeric", day: "numeric" })} →<br />{formatStayDate(b.checkOut, { year: "numeric", month: "numeric", day: "numeric" })}
                  </td>
                  <td className="px-5 py-4 text-[13px] font-semibold text-charcoal">₱{Number(b.totalPrice).toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${b.status === "confirmed" ? "bg-green-100 text-green-700" : b.status === "cancelled" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>{b.status}</span>
                  </td>
                  <td className="px-5 py-4">
                    <Link href={`/admin/bookings/${b.id}`} className="text-[12px] font-semibold text-forest hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
