"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, Search, RefreshCw, Shield, CheckCircle, XCircle,
  Trash2, AlertCircle, ChevronDown, Crown, User, Ban
} from "lucide-react";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string;
  plan: string;
  planExpiresAt: string | null;
  createdAt: string;
  phone?: string;
  businessName?: string;
}

interface Stats {
  total: number;
  verified: number;
  byPlan: { plan: string; _count: { plan: number } }[];
  byRole: { role: string; _count: { role: number } }[];
}

const ROLE_CONFIG: Record<string, { label: string; variant: "success"|"danger"|"warning"|"blue"|"outline"; icon: React.ElementType }> = {
  admin:     { label: "Admin",     variant: "danger",  icon: Shield },
  user:      { label: "User",      variant: "blue",    icon: User },
  suspended: { label: "Suspended", variant: "warning", icon: Ban },
};

const PLAN_CONFIG: Record<string, { label: string; color: string }> = {
  free:       { label: "Free",       color: "text-gray-500 bg-gray-100" },
  starter:    { label: "Starter",    color: "text-blue-600 bg-blue-50" },
  pro:        { label: "Pro",        color: "text-purple-600 bg-purple-50" },
  enterprise: { label: "Enterprise", color: "text-amber-600 bg-amber-50" },
};

const PLANS = ["free", "starter", "pro", "enterprise"];
const ROLES = ["user", "admin", "suspended"];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const isAdmin = session?.user?.email === "admin@sellora.io";

  const fetchUsers = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (roleFilter) params.set("role", roleFilter);
      if (planFilter) params.set("plan", planFilter);
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.status === 403) { setError("Access denied. Admin only."); return; }
      const data = await res.json() as { users: AdminUser[]; stats: Stats };
      setUsers(data.users);
      setStats(data.stats);
    } catch { setError("Failed to load users"); }
    finally { setLoading(false); }
  }, [search, roleFilter, planFilter]);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin, fetchUsers]);

  async function updateUser(userId: string, patch: Record<string, unknown>) {
    setSaving(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...patch }),
      });
      const data = await res.json() as { user?: AdminUser; error?: string };
      if (data.user) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data.user } : u));
      }
    } finally { setSaving(null); }
  }

  async function deleteUser(userId: string) {
    setSaving(userId);
    try {
      await fetch(`/api/admin/users?userId=${userId}`, { method: "DELETE" });
      setUsers(prev => prev.filter(u => u.id !== userId));
      setDeleteConfirm(null);
    } finally { setSaving(null); }
  }

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Admin Panel" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-500">Admin access only</p>
            <p className="text-xs text-gray-400 mt-1">Login as admin@sellora.io to access this panel</p>
          </div>
        </div>
      </div>
    );
  }

  const planCounts = PLANS.map(p => ({
    plan: p,
    count: stats?.byPlan?.find(b => b.plan === p)?._count?.plan ?? 0,
  }));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Admin Panel — User Management" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <Card className="col-span-1">
            <p className="text-2xl font-bold text-gray-900">{stats?.total ?? "—"}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total Users</p>
          </Card>
          <Card className="col-span-1">
            <p className="text-2xl font-bold text-green-600">{stats?.verified ?? "—"}</p>
            <p className="text-xs text-gray-500 mt-0.5">Verified</p>
          </Card>
          {planCounts.map(p => (
            <Card key={p.plan} className="col-span-1">
              <p className={`text-2xl font-bold ${PLAN_CONFIG[p.plan]?.color.split(" ")[0]}`}>{p.count}</p>
              <p className="text-xs text-gray-500 mt-0.5 capitalize">{p.plan}</p>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && fetchUsers()}
                placeholder="Search by name or email..."
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none cursor-pointer">
              <option value="">All Roles</option>
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
            <select value={planFilter} onChange={e => setPlanFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none cursor-pointer">
              <option value="">All Plans</option>
              {PLANS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
            <Button onClick={fetchUsers} loading={loading} size="sm" variant="secondary">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
          </div>
          {error && <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}</div>}
        </Card>

        {/* Users Table */}
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" /> {users.length} users
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-2 text-sm text-gray-500">Loading users...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">No users found</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {users.map(u => {
                const roleCfg = ROLE_CONFIG[u.role] ?? ROLE_CONFIG.user;
                const planCfg = PLAN_CONFIG[u.plan] ?? PLAN_CONFIG.free;
                const isExpanded = expanded === u.id;
                const isSaving = saving === u.id;

                return (
                  <div key={u.id} className={`transition-colors ${isSaving ? "opacity-60" : ""}`}>
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-sm font-bold text-blue-600">
                        {u.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-900">{u.name}</p>
                          {u.emailVerified
                            ? <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                            : <XCircle className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                        {u.businessName && <p className="text-xs text-gray-400">{u.businessName}</p>}
                      </div>

                      {/* Role badge */}
                      <Badge variant={roleCfg.variant}>{roleCfg.label}</Badge>

                      {/* Plan badge */}
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${planCfg.color}`}>
                        {planCfg.label}
                      </span>

                      {/* Joined */}
                      <p className="text-xs text-gray-400 hidden lg:block shrink-0">{fmtDate(u.createdAt)}</p>

                      {/* Expand */}
                      <button onClick={() => setExpanded(isExpanded ? null : u.id)}
                        className="p-1 hover:bg-gray-200 rounded cursor-pointer shrink-0">
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                    </div>

                    {/* Expanded Controls */}
                    {isExpanded && (
                      <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">

                          {/* Role */}
                          <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Role</label>
                            <div className="flex gap-1 flex-wrap">
                              {ROLES.map(r => (
                                <button key={r} disabled={isSaving}
                                  onClick={() => updateUser(u.id, { role: r })}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-all disabled:opacity-50 ${u.role === r ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-200 text-gray-500 hover:border-blue-300"}`}>
                                  {r === "admin" ? "👑 Admin" : r === "suspended" ? "🚫 Suspend" : "👤 User"}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Plan */}
                          <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Plan</label>
                            <div className="flex gap-1 flex-wrap">
                              {PLANS.map(p => (
                                <button key={p} disabled={isSaving}
                                  onClick={() => updateUser(u.id, { plan: p })}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-all disabled:opacity-50 ${u.plan === p ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-200 text-gray-500 hover:border-blue-300"}`}>
                                  {p === "enterprise" ? "🏢" : p === "pro" ? "⭐" : p === "starter" ? "🚀" : "🆓"} {p.charAt(0).toUpperCase() + p.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Email Verified */}
                          <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Email Verified</label>
                            <div className="flex gap-2">
                              <button disabled={isSaving} onClick={() => updateUser(u.id, { emailVerified: true })}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-all disabled:opacity-50 ${u.emailVerified ? "bg-green-600 text-white border-green-600" : "bg-white border-gray-200 text-gray-500 hover:border-green-400"}`}>
                                <CheckCircle className="w-3.5 h-3.5" /> Verified
                              </button>
                              <button disabled={isSaving} onClick={() => updateUser(u.id, { emailVerified: false })}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-all disabled:opacity-50 ${!u.emailVerified ? "bg-red-600 text-white border-red-600" : "bg-white border-gray-200 text-gray-500 hover:border-red-400"}`}>
                                <XCircle className="w-3.5 h-3.5" /> Unverify
                              </button>
                            </div>
                          </div>

                          {/* Delete */}
                          <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Danger Zone</label>
                            {deleteConfirm === u.id ? (
                              <div className="flex gap-2">
                                <button disabled={isSaving} onClick={() => deleteUser(u.id)}
                                  className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 cursor-pointer disabled:opacity-50">
                                  Confirm Delete
                                </button>
                                <button onClick={() => setDeleteConfirm(null)}
                                  className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded-lg cursor-pointer">
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setDeleteConfirm(u.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" /> Delete Account
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Extra info */}
                        <div className="flex gap-4 mt-3 text-xs text-gray-400 flex-wrap">
                          <span>ID: <span className="text-gray-600 font-mono text-[10px]">{u.id}</span></span>
                          <span>Joined: <span className="text-gray-600">{fmtDate(u.createdAt)}</span></span>
                          {u.phone && <span>Phone: <span className="text-gray-600">{u.phone}</span></span>}
                          {u.planExpiresAt && <span>Plan expires: <span className="text-gray-600">{fmtDate(u.planExpiresAt)}</span></span>}
                          {isSaving && <span className="text-blue-500 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Saving...</span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Legend */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-500">
          <Card className="bg-blue-50 border-blue-100 text-blue-700 text-xs">
            <p className="font-semibold mb-1 flex items-center gap-1"><Crown className="w-3.5 h-3.5" /> Admin Login</p>
            <p>Email: admin@sellora.io</p>
            <p>Password: Admin@sellora1</p>
          </Card>
          <Card className="bg-gray-50 border-gray-100 text-xs">
            <p className="font-semibold text-gray-700 mb-1">Roles</p>
            <p>👤 User — normal access</p>
            <p>👑 Admin — full access</p>
            <p>🚫 Suspended — no login</p>
          </Card>
          <Card className="bg-gray-50 border-gray-100 text-xs">
            <p className="font-semibold text-gray-700 mb-1">Plans</p>
            <p>🆓 Free · 🚀 Starter · ⭐ Pro · 🏢 Enterprise</p>
            <p className="mt-1 text-gray-400">Changes save instantly to database</p>
          </Card>
        </div>
      </main>
    </div>
  );
}
