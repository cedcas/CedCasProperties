"use client";
import { useState, useEffect, useCallback } from "react";

interface LogEntry {
  id: number;
  actor: string;
  actorRole: string;
  action: string;
  module: string;
  target: string | null;
  ipAddress: string | null;
  createdAt: string;
}

const MODULE_LABELS: Record<string, string> = {
  properties: "Properties",
  bookings: "Bookings",
  messages: "Messages",
  testimonials: "Testimonials",
  promo_codes: "Promo Codes",
  users: "Users",
  booking_flow: "Booking Flow",
  logs: "Logs",
};

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  manager: "bg-blue-100 text-blue-700",
  guest: "bg-gray-100 text-gray-600",
};

export default function LogsClient({ total, modules }: { total: number; modules: string[] }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(total);
  const LIMIT = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (moduleFilter) params.set("module", moduleFilter);
    if (roleFilter) params.set("actorRole", roleFilter);
    params.set("page", String(page));

    try {
      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      const data = await res.json();
      setLogs(data.logs ?? []);
      setTotalCount(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [search, moduleFilter, roleFilter, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, moduleFilter, roleFilter]);

  const totalPages = Math.ceil(totalCount / LIMIT);

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif font-semibold text-charcoal text-[1.8rem]">Event Log</h1>
        <p className="text-charcoal/45 text-[14px] mt-1">{totalCount.toLocaleString()} total log entries</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04] p-5 mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search actor, action, target…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[220px] border border-black/[.1] rounded-[8px] px-3 py-2 text-[13px] text-charcoal placeholder-charcoal/35 focus:outline-none focus:ring-2 focus:ring-forest/30"
        />
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="border border-black/[.1] rounded-[8px] px-3 py-2 text-[13px] text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30 bg-white"
        >
          <option value="">All Modules</option>
          {modules.map((m) => (
            <option key={m} value={m}>{MODULE_LABELS[m] ?? m}</option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-black/[.1] rounded-[8px] px-3 py-2 text-[13px] text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30 bg-white"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="guest">Guest</option>
        </select>
        <button
          onClick={() => { setSearch(""); setModuleFilter(""); setRoleFilter(""); }}
          className="px-4 py-2 rounded-[8px] text-[13px] text-charcoal/50 hover:text-charcoal border border-black/[.1] hover:bg-black/[.03] transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04] overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <i className="fa-solid fa-circle-notch fa-spin text-charcoal/25 text-[2rem] mb-3 block" />
            <p className="text-charcoal/40 text-[14px]">Loading logs…</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center">
            <i className="fa-solid fa-clipboard-list text-charcoal/20 text-[3rem] mb-4 block" />
            <p className="text-charcoal/40 text-[15px]">No log entries found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-black/[.06] bg-[#F8F9FA]">
                  {["Timestamp", "Actor", "Role", "Module", "Action", "Target", "IP"].map((h) => (
                    <th key={h} className="text-left px-4 py-3.5 text-[11px] font-semibold text-charcoal/50 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[.05]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#FAFAFA] transition-colors text-[13px]">
                    <td className="px-4 py-3 text-charcoal/55 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-PH", {
                        month: "short", day: "numeric", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-charcoal">{log.actor}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${ROLE_BADGE[log.actorRole] ?? "bg-gray-100 text-gray-600"}`}>
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-charcoal/60 whitespace-nowrap">
                      {MODULE_LABELS[log.module] ?? log.module}
                    </td>
                    <td className="px-4 py-3 text-charcoal/80">{log.action}</td>
                    <td className="px-4 py-3 text-charcoal/50 font-mono text-[12px]">{log.target ?? "—"}</td>
                    <td className="px-4 py-3 text-charcoal/40 font-mono text-[12px]">{log.ipAddress ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-black/[.05]">
            <span className="text-[12px] text-charcoal/40">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-[7px] text-[12px] border border-black/[.1] text-charcoal/60 hover:bg-black/[.03] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-[7px] text-[12px] border border-black/[.1] text-charcoal/60 hover:bg-black/[.03] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
