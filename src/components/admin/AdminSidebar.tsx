"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV = [
  { href: "/admin/dashboard",    icon: "fa-gauge-high",       label: "Dashboard" },
  { href: "/admin/properties",   icon: "fa-house",            label: "Properties" },
  { href: "/admin/bookings",     icon: "fa-calendar-check",   label: "Bookings" },
  { href: "/admin/messages",     icon: "fa-envelope",         label: "Messages" },
  { href: "/admin/testimonials", icon: "fa-star",             label: "Testimonials" },
];

export default function AdminSidebar({ user }: { user?: { name?: string | null; email?: string | null } }) {
  const path = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#1c1c1c] flex flex-col z-40 shadow-[4px_0_24px_rgba(0,0,0,.18)]">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/[.07]">
        <Image
          src="/brand-assets/Transparent Logo.png"
          alt="HavenInLipa"
          width={80}
          height={80}
          className="h-[40px] w-auto"
        />
        <span className="text-[10px] text-white/30 tracking-[.15em] uppercase mt-1 block">Admin Portal</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {NAV.map(({ href, icon, label }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-[10px] text-[13.5px] font-medium transition-all duration-200 ${
                active
                  ? "bg-[#FF5371]/15 text-[#FF5371]"
                  : "text-white/55 hover:text-white hover:bg-white/[.06]"
              }`}
            >
              <i className={`fa-solid ${icon} w-4 text-center text-[14px]`} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + sign out */}
      <div className="px-4 py-4 border-t border-white/[.07]">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 rounded-full bg-[#3B5323] flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0">
            {user?.name?.charAt(0) ?? "A"}
          </div>
          <div className="overflow-hidden">
            <div className="text-white text-[13px] font-medium truncate">{user?.name ?? "Admin"}</div>
            <div className="text-white/35 text-[11px] truncate">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="w-full flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] text-white/45 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200"
        >
          <i className="fa-solid fa-arrow-right-from-bracket text-[13px]" />
          Sign Out
        </button>
      </div>

      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossOrigin="anonymous" />
    </aside>
  );
}
