import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getStats() {
  const [properties, bookings, messages, testimonials] = await Promise.all([
    prisma.property.count({ where: { isActive: true } }),
    prisma.booking.count(),
    prisma.contactMessage.count({ where: { isRead: false } }),
    prisma.testimonial.count({ where: { isActive: true } }),
  ]);
  const pendingBookings  = await prisma.booking.count({ where: { status: "pending" } });
  const confirmedBookings = await prisma.booking.count({ where: { status: "confirmed" } });
  const recentBookings   = await prisma.booking.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { property: { select: { name: true } } } });
  const recentMessages   = await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 5 });
  return { properties, bookings, messages, testimonials, pendingBookings, confirmedBookings, recentBookings, recentMessages };
}

export default async function DashboardPage() {
  const stats = await getStats();

  const cards = [
    { label: "Active Properties",  value: stats.properties,       icon: "fa-house",          color: "bg-forest/10 text-forest",   href: "/admin/properties" },
    { label: "Total Bookings",     value: stats.bookings,         icon: "fa-calendar-check",  color: "bg-blue-50 text-blue-600",   href: "/admin/bookings" },
    { label: "Unread Messages",    value: stats.messages,         icon: "fa-envelope",        color: "bg-amber-50 text-amber-600", href: "/admin/messages" },
    { label: "Active Testimonials",value: stats.testimonials,     icon: "fa-star",            color: "bg-purple-50 text-purple-600", href: "/admin/testimonials" },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif font-semibold text-charcoal text-[1.8rem]">Dashboard</h1>
        <p className="text-charcoal/45 text-[14px] mt-1">Welcome back. Here&apos;s what&apos;s happening.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="bg-white rounded-[16px] p-6 shadow-[0_2px_12px_rgba(44,44,44,.07)] hover:shadow-[0_6px_24px_rgba(44,44,44,.12)] hover:-translate-y-0.5 transition-all duration-200 border border-black/[.04]">
            <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center mb-4 ${c.color}`}>
              <i className={`fa-solid ${c.icon} text-[16px]`} />
            </div>
            <div className="font-bold text-charcoal text-[1.8rem] leading-none mb-1">{c.value}</div>
            <div className="text-charcoal/50 text-[12.5px]">{c.label}</div>
          </Link>
        ))}
      </div>

      {/* Booking status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-[16px] p-6 shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04]">
          <h2 className="font-serif font-semibold text-charcoal text-[1rem] mb-5">Booking Status</h2>
          <div className="flex gap-4">
            {[
              { label: "Pending",   value: stats.pendingBookings,   color: "bg-amber-100 text-amber-700" },
              { label: "Confirmed", value: stats.confirmedBookings, color: "bg-green-100 text-green-700" },
              { label: "Total",     value: stats.bookings,          color: "bg-blue-100 text-blue-700" },
            ].map((s) => (
              <div key={s.label} className={`flex-1 ${s.color} rounded-[10px] p-4 text-center`}>
                <div className="font-bold text-[1.6rem]">{s.value}</div>
                <div className="text-[12px] font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-[16px] p-6 shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04]">
          <h2 className="font-serif font-semibold text-charcoal text-[1rem] mb-5">Quick Actions</h2>
          <div className="flex flex-col gap-2">
            {[
              { label: "Add New Property",  href: "/admin/properties/new", icon: "fa-plus" },
              { label: "View All Bookings", href: "/admin/bookings",        icon: "fa-calendar" },
              { label: "Read Messages",     href: "/admin/messages",        icon: "fa-inbox" },
              { label: "View Website",      href: "/",                      icon: "fa-arrow-up-right-from-square" },
            ].map((a) => (
              <Link key={a.label} href={a.href} className="flex items-center gap-3 px-4 py-2.5 rounded-[8px] text-[13.5px] text-charcoal/70 hover:bg-cream hover:text-charcoal transition-all duration-200">
                <i className={`fa-solid ${a.icon} w-4 text-center text-[13px] text-forest`} />
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent bookings */}
      <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04] mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-black/[.06] flex items-center justify-between">
          <h2 className="font-serif font-semibold text-charcoal text-[1rem]">Recent Bookings</h2>
          <Link href="/admin/bookings" className="text-[12px] text-forest font-semibold hover:underline">View all</Link>
        </div>
        {stats.recentBookings.length === 0 ? (
          <div className="px-6 py-10 text-center text-charcoal/40 text-[14px]">No bookings yet.</div>
        ) : (
          <div className="divide-y divide-black/[.05]">
            {stats.recentBookings.map((b) => (
              <div key={b.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-charcoal text-[14px]">{b.guestName}</div>
                  <div className="text-charcoal/45 text-[12px]">{b.property.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] text-charcoal/50">{new Date(b.checkIn).toLocaleDateString()} → {new Date(b.checkOut).toLocaleDateString()}</div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${b.status === "confirmed" ? "bg-green-100 text-green-700" : b.status === "cancelled" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
                    {b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent messages */}
      <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04] overflow-hidden">
        <div className="px-6 py-4 border-b border-black/[.06] flex items-center justify-between">
          <h2 className="font-serif font-semibold text-charcoal text-[1rem]">Recent Messages</h2>
          <Link href="/admin/messages" className="text-[12px] text-forest font-semibold hover:underline">View all</Link>
        </div>
        {stats.recentMessages.length === 0 ? (
          <div className="px-6 py-10 text-center text-charcoal/40 text-[14px]">No messages yet.</div>
        ) : (
          <div className="divide-y divide-black/[.05]">
            {stats.recentMessages.map((m) => (
              <div key={m.id} className={`px-6 py-4 flex items-start justify-between gap-4 ${!m.isRead ? "bg-amber-50/50" : ""}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-charcoal text-[14px]">{m.name}</span>
                    {!m.isRead && <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />}
                  </div>
                  <div className="text-charcoal/45 text-[12px]">{m.subject}</div>
                </div>
                <div className="text-[11px] text-charcoal/35 flex-shrink-0">{new Date(m.createdAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
