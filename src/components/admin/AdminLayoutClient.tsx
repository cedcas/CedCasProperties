"use client";
import { useState, useEffect, useSyncExternalStore } from "react";
import Image from "next/image";
import AdminSidebar from "./AdminSidebar";

const SIDEBAR_STORAGE_KEY = "admin-sidebar-collapsed";

function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getStoredCollapsed() {
  return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

function getServerCollapsed() {
  return false;
}

export default function AdminLayoutClient({
  user,
  children,
  deploymentId,
  deploymentDate,
}: {
  user?: { name?: string | null; email?: string | null };
  children: React.ReactNode;
  deploymentId?: string;
  deploymentDate?: string;
}) {
  // Reads the persisted preference without a mount-effect: getServerSnapshot
  // keeps SSR/hydration output at `false`, then React resyncs to the real
  // localStorage value right after hydration (same effective behavior as
  // the previous useEffect, without a synchronous setState-in-effect).
  const storedCollapsed = useSyncExternalStore(subscribeToStorage, getStoredCollapsed, getServerCollapsed);
  const [collapsedOverride, setCollapsedOverride] = useState<boolean | null>(null);
  const collapsed = collapsedOverride ?? storedCollapsed;
  const [mobileOpen, setMobileOpen] = useState(false);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const toggle = () => {
    const next = !collapsed;
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
    setCollapsedOverride(next);
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex">
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 z-30 bg-[#1c1c1c] flex items-center justify-between px-4 shadow-[0_2px_12px_rgba(0,0,0,.18)]">
        <Image
          src="/brand-assets/Transparent Logo.png"
          alt="HavenInLipa"
          width={80}
          height={80}
          className="h-[30px] w-auto"
        />
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="text-white/70 hover:text-white p-2 rounded-md hover:bg-white/[.06] transition-colors"
        >
          <i className="fa-solid fa-bars text-[18px]" />
        </button>
      </header>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
        />
      )}

      <AdminSidebar
        user={user}
        collapsed={collapsed}
        onToggle={toggle}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        deploymentId={deploymentId}
        deploymentDate={deploymentDate}
      />
      <main
        className={`flex-1 min-h-screen pt-14 lg:pt-0 transition-all duration-300 ${
          collapsed ? "lg:ml-16" : "lg:ml-64"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
