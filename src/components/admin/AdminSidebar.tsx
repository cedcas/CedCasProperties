"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV = [
  { href: "/admin/dashboard",       icon: "fa-gauge-high",       label: "Dashboard" },
  { href: "/admin/properties",      icon: "fa-house",            label: "Properties" },
  { href: "/admin/bookings",        icon: "fa-calendar-check",   label: "Bookings" },
  { href: "/admin/messages",        icon: "fa-envelope",         label: "Messages" },
  { href: "/admin/testimonials",    icon: "fa-star",             label: "Testimonials" },
  { href: "/admin/discount-codes",  icon: "fa-tag",              label: "Promo Codes" },
];

const BOTTOM_NAV = [
  { href: "/admin/users",  icon: "fa-users",           label: "Users" },
  { href: "/admin/logs",   icon: "fa-clipboard-list",  label: "Logs" },
];

interface AdminSidebarProps {
  user?: { name?: string | null; email?: string | null };
  collapsed?: boolean;
  onToggle?: () => void;
  deploymentId?: string;
  deploymentDate?: string;
}

export default function AdminSidebar({ user, collapsed = false, onToggle, deploymentId, deploymentDate }: AdminSidebarProps) {
  const path = usePathname();

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 bg-[#1c1c1c] flex flex-col z-40 shadow-[4px_0_24px_rgba(0,0,0,.18)] transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo + toggle */}
      <div className={`px-3 py-5 border-b border-white/[.07] flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && (
          <div>
            <Image
              src="/brand-assets/Transparent Logo.png"
              alt="HavenInLipa"
              width={80}
              height={80}
              className="h-[40px] w-auto"
            />
            <span className="text-[10px] text-white/30 tracking-[.15em] uppercase mt-1 block">Admin Portal</span>
          </div>
        )}
        {collapsed && (
          <Image
            src="/brand-assets/Transparent Logo.png"
            alt="HavenInLipa"
            width={32}
            height={32}
            className="h-[28px] w-auto"
          />
        )}
        {onToggle && (
          <button
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`text-white/40 hover:text-white/80 transition-colors duration-200 p-1 rounded-md hover:bg-white/[.06] ${collapsed ? "mt-2" : ""}`}
          >
            <i className={`fa-solid ${collapsed ? "fa-chevron-right" : "fa-chevron-left"} text-[12px]`} />
          </button>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-2 py-4 flex flex-col gap-1 overflow-y-auto">
        {NAV.map(({ href, icon, label }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13.5px] font-medium transition-all duration-200 ${
                collapsed ? "justify-center" : ""
              } ${
                active
                  ? "bg-[#FF5371]/15 text-[#FF5371]"
                  : "text-white/55 hover:text-white hover:bg-white/[.06]"
              }`}
            >
              <i className={`fa-solid ${icon} w-4 text-center text-[14px] flex-shrink-0`} />
              {!collapsed && label}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-2 border-t border-white/[.06]" />

        {/* Bottom nav items (Users + Logs) */}
        {BOTTOM_NAV.map(({ href, icon, label }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13.5px] font-medium transition-all duration-200 ${
                collapsed ? "justify-center" : ""
              } ${
                active
                  ? "bg-[#FF5371]/15 text-[#FF5371]"
                  : "text-white/55 hover:text-white hover:bg-white/[.06]"
              }`}
            >
              <i className={`fa-solid ${icon} w-4 text-center text-[14px] flex-shrink-0`} />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      {/* User + deployment + sign out */}
      <div className="px-2 py-4 border-t border-white/[.07]">
        {!collapsed && (
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-[#3B5323] flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0">
              {user?.name?.charAt(0) ?? "A"}
            </div>
            <div className="overflow-hidden">
              <div className="text-white text-[13px] font-medium truncate">{user?.name ?? "Admin"}</div>
              <div className="text-white/35 text-[11px] truncate">{user?.email}</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center mb-3">
            <div className="w-8 h-8 rounded-full bg-[#3B5323] flex items-center justify-center text-white text-[13px] font-bold">
              {user?.name?.charAt(0) ?? "A"}
            </div>
          </div>
        )}

        {/* Deployment info */}
        {!collapsed && (deploymentId || deploymentDate) && (
          <div className="mx-2 mb-3 px-3 py-2 rounded-[8px] bg-white/[.04] border border-white/[.06]">
            {deploymentDate && (
              <div className="text-white/30 text-[10px] leading-tight">
                <span className="text-white/20">Deployed</span> {deploymentDate}
              </div>
            )}
            {deploymentId && (
              <div className="text-white/20 text-[10px] font-mono mt-0.5">{deploymentId}</div>
            )}
          </div>
        )}

        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          title={collapsed ? "Sign Out" : undefined}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-[8px] text-[13px] text-white/45 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <i className="fa-solid fa-arrow-right-from-bracket text-[13px]" />
          {!collapsed && "Sign Out"}
        </button>
      </div>

      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossOrigin="anonymous" />
    </aside>
  );
}
