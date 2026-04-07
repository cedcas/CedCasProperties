"use client";
import { useState } from "react";

const MODULES = [
  { key: "properties", label: "Properties" },
  { key: "bookings", label: "Bookings" },
  { key: "messages", label: "Messages" },
  { key: "testimonials", label: "Testimonials" },
  { key: "promoCodes", label: "Promo Codes" },
  { key: "logs", label: "Logs" },
  { key: "userManagement", label: "User Management" },
] as const;

type ModuleKey = (typeof MODULES)[number]["key"];

interface Permissions {
  properties: boolean;
  bookings: boolean;
  messages: boolean;
  testimonials: boolean;
  promoCodes: boolean;
  logs: boolean;
  userManagement: boolean;
}

interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  permissions: (Permissions & { id: number; adminUserId: number }) | null;
}

function defaultPermissions(): Permissions {
  return { properties: false, bookings: false, messages: false, testimonials: false, promoCodes: false, logs: false, userManagement: false };
}

export default function UsersClient({
  initialUsers,
  currentUserId,
}: {
  initialUsers: AdminUser[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "manager" as "admin" | "manager", permissions: defaultPermissions() });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const openCreate = () => {
    setEditingUser(null);
    setForm({ name: "", email: "", password: "", role: "manager", permissions: defaultPermissions() });
    setError("");
    setShowForm(true);
  };

  const openEdit = (u: AdminUser) => {
    setEditingUser(u);
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role as "admin" | "manager",
      permissions: u.permissions
        ? { properties: u.permissions.properties, bookings: u.permissions.bookings, messages: u.permissions.messages, testimonials: u.permissions.testimonials, promoCodes: u.permissions.promoCodes, logs: u.permissions.logs, userManagement: u.permissions.userManagement }
        : defaultPermissions(),
    });
    setError("");
    setShowForm(true);
  };

  const handlePermissionToggle = (key: ModuleKey) => {
    setForm((prev) => ({ ...prev, permissions: { ...prev.permissions, [key]: !prev.permissions[key] } }));
  };

  const handleSubmit = async () => {
    setError("");
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        role: form.role,
        permissions: form.role === "manager" ? form.permissions : undefined,
      };
      if (form.password) payload.password = form.password;

      const url = editingUser ? `/api/admin/users/${editingUser.id}` : "/api/admin/users";
      const method = editingUser ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save"); return; }

      // Refresh list
      const listRes = await fetch("/api/admin/users");
      const listData = await listRes.json();
      setUsers(listData.users ?? users);
      setShowForm(false);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: AdminUser) => {
    if (!confirm(`Delete ${u.name} (${u.email})? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Failed to delete"); return; }
    setUsers((prev) => prev.filter((x) => x.id !== u.id));
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif font-semibold text-charcoal text-[1.8rem]">User Management</h1>
          <p className="text-charcoal/45 text-[14px] mt-1">{users.length} user{users.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-forest text-white px-4 py-2.5 rounded-[10px] text-[13.5px] font-medium hover:bg-forest/90 transition-colors shadow-sm"
        >
          <i className="fa-solid fa-plus text-[12px]" />
          Add User
        </button>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04] overflow-hidden mb-8">
        {users.length === 0 ? (
          <div className="py-16 text-center">
            <i className="fa-solid fa-users text-charcoal/20 text-[3rem] mb-4 block" />
            <p className="text-charcoal/40 text-[15px]">No users found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-black/[.06] bg-[#F8F9FA]">
                  {["Name", "Email", "Role", "Joined", "Actions"].map((h) => (
                    <th key={h} className="text-left px-5 py-3.5 text-[11px] font-semibold text-charcoal/50 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[.05]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-forest/15 flex items-center justify-center text-forest text-[13px] font-bold flex-shrink-0">
                          {u.name.charAt(0)}
                        </div>
                        <span className="font-medium text-charcoal text-[14px]">{u.name}</span>
                        {String(u.id) === currentUserId && (
                          <span className="px-1.5 py-0.5 bg-gold/15 text-gold text-[10px] font-semibold rounded-full">You</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[13px] text-charcoal/65">{u.email}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[12px] text-charcoal/45">
                      {new Date(u.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(u)}
                          className="px-3 py-1.5 rounded-[7px] text-[12px] text-charcoal/60 border border-black/[.1] hover:bg-black/[.04] transition-colors"
                        >
                          Edit
                        </button>
                        {String(u.id) !== currentUserId && (
                          <button
                            onClick={() => handleDelete(u)}
                            className="px-3 py-1.5 rounded-[7px] text-[12px] text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-black/[.06]">
              <h2 className="font-serif font-semibold text-charcoal text-[1.2rem]">
                {editingUser ? "Edit User" : "Create User"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-charcoal/40 hover:text-charcoal transition-colors p-1"
              >
                <i className="fa-solid fa-xmark text-[16px]" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-[13px] px-4 py-3 rounded-[10px]">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[12px] font-semibold text-charcoal/60 uppercase tracking-wide mb-1.5">Full Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full border border-black/[.1] rounded-[9px] px-3 py-2.5 text-[13.5px] text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30"
                  placeholder="Jane Smith"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-charcoal/60 uppercase tracking-wide mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full border border-black/[.1] rounded-[9px] px-3 py-2.5 text-[13.5px] text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30"
                  placeholder="jane@example.com"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-charcoal/60 uppercase tracking-wide mb-1.5">
                  Password {editingUser && <span className="text-charcoal/35 normal-case font-normal">(leave blank to keep current)</span>}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  className="w-full border border-black/[.1] rounded-[9px] px-3 py-2.5 text-[13.5px] text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30"
                  placeholder={editingUser ? "••••••••" : "Minimum 8 characters"}
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-charcoal/60 uppercase tracking-wide mb-1.5">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as "admin" | "manager" }))}
                  className="w-full border border-black/[.1] rounded-[9px] px-3 py-2.5 text-[13.5px] text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30 bg-white"
                >
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {form.role === "manager" && (
                <div>
                  <label className="block text-[12px] font-semibold text-charcoal/60 uppercase tracking-wide mb-3">
                    Module Permissions
                    <span className="ml-2 text-charcoal/35 normal-case font-normal">(all off by default)</span>
                  </label>
                  <div className="space-y-2 border border-black/[.08] rounded-[12px] p-4 bg-[#FAFAFA]">
                    {MODULES.map(({ key, label }) => (
                      <label key={key} className="flex items-center justify-between cursor-pointer">
                        <span className="text-[13.5px] text-charcoal/75">{label}</span>
                        <button
                          type="button"
                          onClick={() => handlePermissionToggle(key)}
                          className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 focus:outline-none ${form.permissions[key] ? "bg-forest" : "bg-black/20"}`}
                          style={{ width: 40, height: 22 }}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-transform duration-200 ${form.permissions[key] ? "translate-x-[18px]" : "translate-x-0"}`}
                          />
                        </button>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 pb-6 pt-2">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 rounded-[10px] border border-black/[.1] text-[13.5px] text-charcoal/60 hover:bg-black/[.04] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !form.name || !form.email || (!editingUser && !form.password)}
                className="flex-1 px-4 py-2.5 rounded-[10px] bg-forest text-white text-[13.5px] font-medium hover:bg-forest/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Saving…" : editingUser ? "Save Changes" : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
