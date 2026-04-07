"use client";
import { useState, useEffect } from "react";
import AdminSidebar from "./AdminSidebar";

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
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("admin-sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      localStorage.setItem("admin-sidebar-collapsed", String(!prev));
      return !prev;
    });
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex">
      <AdminSidebar
        user={user}
        collapsed={collapsed}
        onToggle={toggle}
        deploymentId={deploymentId}
        deploymentDate={deploymentDate}
      />
      <main
        className={`flex-1 min-h-screen transition-all duration-300 ${
          collapsed ? "lg:ml-16" : "lg:ml-64"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
