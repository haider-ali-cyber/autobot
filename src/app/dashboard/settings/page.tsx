"use client";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User, Bell, Globe, CreditCard, Shield, LogOut,
  Check, ChevronRight, Zap, Package, BarChart2, AlertTriangle, Camera, X
} from "lucide-react";

type Tab = "profile" | "notifications" | "preferences" | "billing" | "security";

const tabs: { id: Tab; label: string; icon: typeof User }[] = [
  { id: "profile",       label: "Profile",        icon: User },
  { id: "notifications", label: "Notifications",  icon: Bell },
  { id: "preferences",   label: "Preferences",    icon: Globe },
  { id: "billing",       label: "Plan & Billing",  icon: CreditCard },
  { id: "security",      label: "Security",        icon: Shield },
];

const timezones = [
  "UTC-12:00 — Baker Island",
  "UTC-10:00 — Hawaii (HST)",
  "UTC-8:00  — Alaska (AKST)",
  "UTC-7:00  — Pacific Time (PST)",
  "UTC-6:00  — Mountain Time (MST)",
  "UTC-5:00  — Central Time (CST)",
  "UTC-4:00  — Eastern Time (EST)",
  "UTC-3:30  — Newfoundland (NST)",
  "UTC-3:00  — Buenos Aires (ART)",
  "UTC-1:00  — Azores (AZOT)",
  "UTC+0:00  — London / GMT (GMT)",
  "UTC+1:00  — Central Europe (CET)",
  "UTC+2:00  — Eastern Europe / Cairo (EET)",
  "UTC+3:00  — Riyadh / Moscow (AST)",
  "UTC+3:30  — Tehran (IRST)",
  "UTC+4:00  — Dubai / Abu Dhabi (GST)",
  "UTC+4:30  — Kabul (AFT)",
  "UTC+5:00  — Karachi / Islamabad (PKT)",
  "UTC+5:30  — Mumbai / Delhi / Colombo (IST)",
  "UTC+5:45  — Kathmandu (NPT)",
  "UTC+6:00  — Dhaka / Almaty (BST)",
  "UTC+6:30  — Yangon (MMT)",
  "UTC+7:00  — Bangkok / Jakarta (ICT)",
  "UTC+8:00  — Singapore / Beijing / KL (SGT)",
  "UTC+9:00  — Tokyo / Seoul (JST)",
  "UTC+9:30  — Adelaide (ACST)",
  "UTC+10:00 — Sydney / Melbourne (AEST)",
  "UTC+11:00 — Solomon Islands (SBT)",
  "UTC+12:00 — Auckland / Fiji (NZST)",
  "UTC+13:00 — Samoa (WST)",
];

const currencies = [
  { code: "USD", symbol: "$",    label: "US Dollar" },
  { code: "GBP", symbol: "£",    label: "British Pound" },
  { code: "EUR", symbol: "€",    label: "Euro" },
  { code: "PKR", symbol: "₨",    label: "Pakistani Rupee" },
  { code: "AED", symbol: "د.إ",  label: "UAE Dirham" },
  { code: "SAR", symbol: "﷼",    label: "Saudi Riyal" },
  { code: "CAD", symbol: "C$",   label: "Canadian Dollar" },
  { code: "AUD", symbol: "A$",   label: "Australian Dollar" },
  { code: "INR", symbol: "₹",    label: "Indian Rupee" },
  { code: "SGD", symbol: "S$",   label: "Singapore Dollar" },
  { code: "MYR", symbol: "RM",   label: "Malaysian Ringgit" },
  { code: "BDT", symbol: "৳",    label: "Bangladeshi Taka" },
  { code: "NPR", symbol: "₨",    label: "Nepali Rupee" },
  { code: "LKR", symbol: "Rs",   label: "Sri Lankan Rupee" },
  { code: "CNY", symbol: "¥",    label: "Chinese Yuan" },
  { code: "JPY", symbol: "¥",    label: "Japanese Yen" },
  { code: "TRY", symbol: "₺",    label: "Turkish Lira" },
  { code: "EGP", symbol: "£",    label: "Egyptian Pound" },
  { code: "BRL", symbol: "R$",   label: "Brazilian Real" },
  { code: "MXN", symbol: "$",    label: "Mexican Peso" },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer shrink-0 ${checked ? "bg-blue-600" : "bg-gray-200"}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${checked ? "left-5" : "left-0.5"}`} />
    </button>
  );
}

function Field({ label, value, onChange, type = "text", hint, readOnly }: { label: string; value: string; onChange?: (v: string) => void; type?: string; hint?: string; readOnly?: boolean }) {
  const effectiveReadOnly = readOnly ?? !onChange;
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      <input
        type={type}
        value={value}
        readOnly={effectiveReadOnly}
        onChange={e => onChange?.(e.target.value)}
        className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors ${effectiveReadOnly ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-gray-50 border-gray-200"}`}
      />
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: session, update: updateSession } = useSession();

  const [tab, setTab] = useState<Tab>("profile");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({ name: "", email: "", phone: "", businessName: "" });
  const [passwords, setPasswords] = useState({ current: "", newPw: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [displayPrefs, setDisplayPrefs] = useState({ revenue: true, margin: true, compact: false });
  const [notifs, setNotifs] = useState({
    orderUpdates: true, priceAlerts: true, reviewAlerts: false,
    weeklyReport: true, hijackAlerts: true, lowInventory: false,
    salesMilestone: true, newMessage: true,
  });

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  useEffect(() => {
    if (session?.user) {
      setProfile(p => ({
        ...p,
        name: session.user?.name ?? p.name,
        email: session.user?.email ?? p.email,
      }));
    }
  }, [session]);

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const res = await fetch("/api/user/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profile.name, phone: profile.phone, businessName: profile.businessName }),
      });
      if (res.ok) {
        await updateSession({ name: profile.name }).catch(() => undefined);
        save();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange() {
    setPwError("");
    if (!passwords.current) { setPwError("Enter your current password"); return; }
    if (passwords.newPw.length < 8) { setPwError("Minimum 8 characters required"); return; }
    if (passwords.newPw !== passwords.confirm) { setPwError("Passwords do not match"); return; }
    setPwSaving(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: passwords.current, newPassword: passwords.newPw }),
      });
      if (res.ok) {
        setPasswords({ current: "", newPw: "", confirm: "" });
        save();
      } else {
        const d = await res.json().catch(() => ({}));
        setPwError(d.error ?? "Failed to update password");
      }
    } finally {
      setPwSaving(false);
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      e.currentTarget.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      e.currentTarget.value = "";
      return;
    }

    const url = URL.createObjectURL(file);
    setPhotoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    e.currentTarget.value = "";
  }

  async function handleSignOut() {
    try {
      await signOut({ redirect: false });
    } catch {}

    router.push("/login");
    router.refresh();
  }

  async function handleDeleteConfirm() {
    if (deleteText === "DELETE") {
      try {
        await signOut({ redirect: false });
      } catch {}

      setShowDeleteModal(false);
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Settings" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-6">

            {/* Tab Sidebar */}
            <div className="w-48 shrink-0 space-y-0.5">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer text-left ${
                    tab === t.id ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <t.icon className="w-4 h-4 shrink-0" />
                  {t.label}
                  {tab === t.id && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
                </button>
              ))}
              <div className="pt-3 border-t border-gray-200 mt-3">
                <button onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0 space-y-4">

              {/* ── PROFILE ── */}
              {tab === "profile" && (
                <>
                  <Card>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Profile Information</h3>
                    <div className="flex items-center gap-5 mb-6 pb-5 border-b border-gray-100">
                      {/* Avatar with upload */}
                      <div className="relative group shrink-0">
                        <div className="relative w-18 h-18 w-[72px] h-[72px] rounded-full overflow-hidden bg-blue-600 flex items-center justify-center ring-2 ring-blue-100">
                          {photoUrl
                            ? <Image src={photoUrl} alt="Profile" fill sizes="72px" className="object-cover" unoptimized />
                            : <span className="text-white text-2xl font-bold">{(session?.user?.name?.[0] ?? session?.user?.email?.[0] ?? "?").toUpperCase()}</span>
                          }
                        </div>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                        >
                          <Camera className="w-5 h-5 text-white" />
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-gray-900">{session?.user?.name ?? "—"}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{session?.user?.email ?? "—"}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="blue">Growth Plan</Badge>
                          <span className="text-xs text-gray-400">Member since Jan 2026</span>
                        </div>
                        <button onClick={() => fileInputRef.current?.click()}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer">
                          {photoUrl ? "Change photo" : "Upload photo"}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Full Name" value={profile.name} onChange={v => setProfile(p => ({ ...p, name: v }))} />
                      <Field label="Email Address" value={profile.email} type="email" readOnly />
                      <Field label="Business Name" value={profile.businessName} onChange={v => setProfile(p => ({ ...p, businessName: v }))} />
                      <Field label="Phone Number" value={profile.phone} onChange={v => setProfile(p => ({ ...p, phone: v }))} />
                    </div>
                  </Card>
                  <Card>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">Store Details</h3>
                    <p className="text-xs text-gray-500 mb-4">These are synced from your connected integrations</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Amazon Store Name" value="Sellora Official" />
                      <Field label="Amazon Seller ID" value="A2EXAMPLEID123" readOnly />
                      <Field label="Shopify Store URL" value="ali-store.myshopify.com" />
                      <Field label="TikTok Shop Handle" value="@sellora.pk" />
                    </div>
                  </Card>
                  <div className="flex justify-end">
                    <Button onClick={saveProfile} disabled={saving}>
                      {saving ? "Saving…" : saved ? <><Check className="w-4 h-4" /> Saved!</> : "Save Changes"}
                    </Button>
                  </div>
                </>
              )}

              {/* ── NOTIFICATIONS ── */}
              {tab === "notifications" && (
                <Card>
                  <h3 className="text-sm font-semibold text-gray-900 mb-0.5">Notification Preferences</h3>
                  <p className="text-xs text-gray-500 mb-5">Control what alerts you receive via email and in-app</p>
                  <div className="divide-y divide-gray-100">
                    {[
                      { key: "orderUpdates",    label: "Order Updates",            desc: "New orders, shipments, and delivery confirmations" },
                      { key: "priceAlerts",     label: "Competitor Price Alerts",  desc: "When a tracked competitor changes their price" },
                      { key: "reviewAlerts",    label: "Negative Review Alerts",   desc: "When your product receives a 1–2 star review" },
                      { key: "weeklyReport",    label: "Weekly Revenue Report",    desc: "Every Monday — revenue, orders & top products" },
                      { key: "hijackAlerts",    label: "Hijacker Alerts",          desc: "Unauthorized seller detected on your ASIN" },
                      { key: "lowInventory",    label: "Low Inventory Warning",    desc: "FBA stock drops below 30 units" },
                      { key: "salesMilestone",  label: "Sales Milestones",         desc: "When you hit $1K, $5K, $10K revenue milestones" },
                      { key: "newMessage",      label: "New Inbox Message",        desc: "New WhatsApp / Facebook message received" },
                    ].map(n => (
                      <div key={n.key} className="flex items-center justify-between py-3.5">
                        <div className="pr-4">
                          <p className="text-sm font-medium text-gray-900">{n.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{n.desc}</p>
                        </div>
                        <Toggle
                          checked={notifs[n.key as keyof typeof notifs]}
                          onChange={() => setNotifs(p => ({ ...p, [n.key]: !p[n.key as keyof typeof notifs] }))}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
                    <Button onClick={save}>
                      {saved ? <><Check className="w-4 h-4" /> Saved!</> : "Save Preferences"}
                    </Button>
                  </div>
                </Card>
              )}

              {/* ── PREFERENCES ── */}
              {tab === "preferences" && (
                <>
                  <Card>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Platform & Regional</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Platform</label>
                        <select defaultValue="Amazon" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500 cursor-pointer">
                          {["Amazon", "Shopify", "TikTok Shop"].map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Primary Market</label>
                        <select defaultValue="USA" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500 cursor-pointer">
                          {["USA", "UK", "EU", "UAE", "Canada", "Australia", "Pakistan", "India", "Saudi Arabia", "Bangladesh", "Malaysia", "Singapore"].map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Currency</label>
                        <select defaultValue="USD" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500 cursor-pointer">
                          {currencies.map(c => (
                            <option key={c.code} value={c.code}>
                              {c.code} ({c.symbol}) — {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Timezone</label>
                        <select defaultValue="UTC+5:00  — Karachi / Islamabad (PKT)" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500 cursor-pointer">
                          {timezones.map(tz => <option key={tz}>{tz}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Language</label>
                        <select defaultValue="English (US)" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500 cursor-pointer">
                          {["English (US)", "English (UK)", "Urdu", "Arabic", "Hindi", "Malay"].map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Format</label>
                        <select defaultValue="MM/DD/YYYY" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500 cursor-pointer">
                          {["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"].map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>
                  </Card>
                  <Card>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">Dashboard Display</h3>
                    <p className="text-xs text-gray-500 mb-4">Customize what you see on your dashboard</p>
                    <div className="divide-y divide-gray-100">
                      {[
                        { label: "Show revenue in dashboard overview",    key: "revenue" as const },
                        { label: "Show profit margin on product cards",   key: "margin"  as const },
                        { label: "Compact sidebar by default",            key: "compact" as const },
                      ].map(p => (
                        <div key={p.key} className="flex items-center justify-between py-3">
                          <p className="text-sm text-gray-700">{p.label}</p>
                          <Toggle checked={displayPrefs[p.key]} onChange={() => setDisplayPrefs(prev => ({ ...prev, [p.key]: !prev[p.key] }))} />
                        </div>
                      ))}
                    </div>
                  </Card>
                  <div className="flex justify-end">
                    <Button onClick={save}>
                      {saved ? <><Check className="w-4 h-4" /> Saved!</> : "Save Preferences"}
                    </Button>
                  </div>
                </>
              )}

              {/* ── BILLING ── */}
              {tab === "billing" && (
                <>
                  <Card className="border-blue-200 bg-blue-50/30">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Zap className="w-4 h-4 text-blue-600" />
                          <h3 className="text-sm font-semibold text-gray-900">Growth Plan</h3>
                          <Badge variant="blue">Active</Badge>
                        </div>
                        <p className="text-xs text-gray-500">Renews on April 30, 2026 · $49/mo · Visa ending 4242</p>
                      </div>
                      <Button size="sm" variant="secondary">Manage Subscription</Button>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      {[
                        { label: "Products Tracked", used: 47, total: 100, icon: Package },
                        { label: "API Syncs / day",  used: 18, total: 50,  icon: BarChart2 },
                        { label: "Team Members",      used: 1,  total: 3,   icon: User },
                      ].map(u => (
                        <div key={u.label} className="bg-white rounded-lg p-3 border border-blue-100">
                          <u.icon className="w-3.5 h-3.5 text-blue-600 mb-1" />
                          <p className="text-xs text-gray-500">{u.label}</p>
                          <p className="text-sm font-semibold text-gray-900 mt-0.5">{u.used} / {u.total}</p>
                          <div className="h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${(u.used / u.total) > 0.8 ? "bg-amber-500" : "bg-blue-500"}`}
                              style={{ width: `${(u.used / u.total) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { name: "Starter", price: "$19", period: "/mo", desc: "Solo sellers just starting out", badge: null,
                        features: ["25 products tracked", "Basic analytics", "1 store", "Email support"], current: false },
                      { name: "Growth",  price: "$49", period: "/mo", desc: "Most popular for scaling brands", badge: "Most Popular",
                        features: ["100 products tracked", "All 16 tools included", "3 stores", "Priority support", "Weekly reports"], current: true },
                      { name: "Pro",     price: "$99", period: "/mo", desc: "High-volume 6–7 figure sellers", badge: null,
                        features: ["Unlimited products", "API access", "5 stores", "Dedicated manager", "Custom reports"], current: false },
                    ].map(p => (
                      <Card key={p.name} className={`relative ${p.current ? "border-blue-400 ring-2 ring-blue-100 shadow-sm" : ""}`}>
                        {p.badge && (
                          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                            <Badge variant="blue">{p.badge}</Badge>
                          </div>
                        )}
                        <div className="flex items-center justify-between mb-2 mt-1">
                          <p className="text-sm font-bold text-gray-900">{p.name}</p>
                          {p.current && <Badge variant="success">Current</Badge>}
                        </div>
                        <div className="mb-1">
                          <span className="text-2xl font-bold text-gray-900">{p.price}</span>
                          <span className="text-xs text-gray-500">{p.period}</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">{p.desc}</p>
                        <ul className="space-y-1.5 mb-4">
                          {p.features.map(f => (
                            <li key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
                              <Check className="w-3 h-3 text-green-600 shrink-0" /> {f}
                            </li>
                          ))}
                        </ul>
                        <Button size="sm" variant={p.current ? "secondary" : "primary"} className="w-full" disabled={p.current}>
                          {p.current ? "Current Plan" : `Upgrade to ${p.name}`}
                        </Button>
                      </Card>
                    ))}
                  </div>

                  <Card>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900">Billing History</h3>
                      <Button size="sm" variant="secondary">Download All</Button>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {[
                        { date: "Mar 30, 2026", desc: "Growth Plan — Monthly", amount: "$49.00", status: "Paid" },
                        { date: "Feb 28, 2026", desc: "Growth Plan — Monthly", amount: "$49.00", status: "Paid" },
                        { date: "Jan 31, 2026", desc: "Growth Plan — Monthly", amount: "$49.00", status: "Paid" },
                        { date: "Dec 31, 2025", desc: "Growth Plan — Monthly", amount: "$49.00", status: "Paid" },
                      ].map((inv, i) => (
                        <div key={i} className="flex items-center justify-between py-3">
                          <div>
                            <p className="text-sm text-gray-900">{inv.desc}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{inv.date}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-gray-900">{inv.amount}</span>
                            <Badge variant="success">{inv.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </>
              )}

              {/* ── SECURITY ── */}
              {tab === "security" && (
                <>
                  <Card>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Change Password</h3>
                    <div className="space-y-3 max-w-sm">
                      <Field label="Current Password" value={passwords.current} onChange={v => setPasswords(p => ({ ...p, current: v }))} type="password" />
                      <Field label="New Password" value={passwords.newPw} onChange={v => setPasswords(p => ({ ...p, newPw: v }))} type="password" hint="Minimum 8 characters, include numbers & symbols" />
                      <Field label="Confirm New Password" value={passwords.confirm} onChange={v => setPasswords(p => ({ ...p, confirm: v }))} type="password" />
                    </div>
                    {pwError && <p className="text-xs text-red-600 mt-2">{pwError}</p>}
                    <Button size="sm" className="mt-4" onClick={handlePasswordChange} disabled={pwSaving}>
                      {pwSaving ? "Updating…" : saved ? <><Check className="w-4 h-4" /> Updated!</> : "Update Password"}
                    </Button>
                  </Card>

                  <Card>
                    <h3 className="text-sm font-semibold text-gray-900 mb-0.5">Two-Factor Authentication</h3>
                    <p className="text-xs text-gray-500 mb-4">Extra security layer — requires OTP on every login</p>
                    <div className="space-y-2">
                      {[
                        { label: "Authenticator App", desc: "Google Authenticator or Authy", recommended: true },
                        { label: "SMS / WhatsApp OTP", desc: "One-time code sent to +92 300 ****567", recommended: false },
                      ].map((m, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900">{m.label}</p>
                              {m.recommended && <Badge variant="success">Recommended</Badge>}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
                          </div>
                          <Button size="sm" variant="secondary">Enable</Button>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Active Sessions</h3>
                    <div className="space-y-2">
                      {[
                        { device: "Chrome — Windows 11", location: "Lahore, PK", time: "Now (current)", current: true },
                        { device: "Safari — iPhone 15",  location: "Islamabad, PK", time: "2 hours ago", current: false },
                      ].map((s, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-medium text-gray-900">{s.device}</p>
                              {s.current && <Badge variant="blue">This session</Badge>}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{s.location} · {s.time}</p>
                          </div>
                          {!s.current && <Button size="sm" variant="danger">Revoke</Button>}
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="border-red-200 bg-red-50/20">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <h3 className="text-sm font-semibold text-red-700">Danger Zone</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Sign out all devices</p>
                          <p className="text-xs text-gray-500">Revoke all active sessions except this one</p>
                        </div>
                        <Button size="sm" variant="secondary">Sign Out All</Button>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Delete Account</p>
                          <p className="text-xs text-gray-500">Permanently delete your account and all stored data</p>
                        </div>
                        <Button size="sm" variant="danger" onClick={() => setShowDeleteModal(true)}>Delete Account</Button>
                      </div>
                    </div>
                  </Card>
                </>
              )}

            </div>
          </div>
        </div>
      </main>

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-md p-6 animate-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">Delete Account</h3>
              </div>
              <button onClick={() => { setShowDeleteModal(false); setDeleteText(""); }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-700 leading-relaxed">
                This will <strong>permanently delete</strong> your account, all products, orders, data, and integrations. This action <strong>cannot be undone</strong>.
              </p>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              To confirm, type <strong className="text-gray-900 font-mono">DELETE</strong> below:
            </p>
            <input
              value={deleteText}
              onChange={e => setDeleteText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-400 mb-4 font-mono"
            />
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => { setShowDeleteModal(false); setDeleteText(""); }}>
                Cancel
              </Button>
              <Button variant="danger" className="flex-1" disabled={deleteText !== "DELETE"} onClick={handleDeleteConfirm}>
                Yes, Delete Account
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
