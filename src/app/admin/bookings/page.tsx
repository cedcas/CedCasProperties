import { prisma } from "@/lib/prisma";
import DeleteButton from "@/components/admin/DeleteButton";
import BookingStatusSelect from "@/components/admin/BookingStatusSelect";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: { property: { select: { name: true } } },
  });

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif font-semibold text-charcoal text-[1.8rem]">Bookings</h1>
        <p className="text-charcoal/45 text-[14px] mt-1">{bookings.length} total booking{bookings.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04] overflow-hidden">
        {bookings.length === 0 ? (
          <div className="py-20 text-center">
            <i className="fa-solid fa-calendar text-charcoal/20 text-[3rem] mb-4 block" />
            <p className="text-charcoal/40 text-[15px]">No bookings yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-black/[.06] bg-[#F8F9FA]">
                  {["Guest", "Property", "Dates", "Guests", "Total", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left px-5 py-3.5 text-[11px] font-semibold text-charcoal/50 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[.05]">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-medium text-charcoal text-[14px]">{b.guestName}</div>
                      <div className="text-charcoal/40 text-[12px]">{b.guestEmail}</div>
                    </td>
                    <td className="px-5 py-4 text-[13px] text-charcoal/70">{b.property.name}</td>
                    <td className="px-5 py-4 text-[12px] text-charcoal/60">
                      {new Date(b.checkIn).toLocaleDateString()} →<br />{new Date(b.checkOut).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-[13px] text-charcoal/70 text-center">{b.guests}</td>
                    <td className="px-5 py-4 text-[13px] font-semibold text-charcoal">₱{Number(b.totalPrice).toLocaleString()}</td>
                    <td className="px-5 py-4"><BookingStatusSelect id={b.id} status={b.status} /></td>
                    <td className="px-5 py-4"><DeleteButton id={b.id} type="booking" /></td>
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
