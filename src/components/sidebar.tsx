"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard, Search, KeyRound, FileText, Eye, Package,
  Calculator, BarChart2, Megaphone, Star, TrendingUp, Shield,
  CheckSquare, ImageIcon, ShoppingCart, ChevronLeft, ChevronRight,
  Settings, HelpCircle, Link2, Inbox, Rocket, Target, Mail
} from "lucide-react";
import { useState } from "react";
import { useSession } from "next-auth/react";

const sections = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart2 },
      { href: "/dashboard/order-management", label: "Orders", icon: ShoppingCart },
    ],
  },
  {
    label: "Research",
    items: [
      { href: "/dashboard/product-hunter", label: "Product Research", icon: Search },
      { href: "/dashboard/keyword-research", label: "Keyword Research", icon: KeyRound },
      { href: "/dashboard/trend-predictor", label: "Trend Finder", icon: TrendingUp },
      { href: "/dashboard/competitor-spy", label: "Competitor Analysis", icon: Eye },
      { href: "/dashboard/review-intelligence", label: "Review Analysis", icon: Star },
      { href: "/dashboard/ad-spy", label: "Ad Intelligence", icon: Megaphone },
    ],
  },
  {
    label: "Listing & Content",
    items: [
      { href: "/dashboard/launch-studio", label: "Launch Studio", icon: Rocket },
      { href: "/dashboard/listing-generator", label: "Listing Builder", icon: FileText },
      { href: "/dashboard/photo-enhancer", label: "AI Ad Creator", icon: ImageIcon },
      { href: "/dashboard/ppc-builder", label: "PPC Builder", icon: Target },
      { href: "/dashboard/email-generator", label: "Email Sequences", icon: Mail },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/dashboard/supplier-finder", label: "Supplier Finder", icon: Package },
      { href: "/dashboard/profit-calculator", label: "Profit Calculator", icon: Calculator },
      { href: "/dashboard/compliance", label: "Compliance", icon: CheckSquare },
      { href: "/dashboard/brand-protection", label: "Brand Protection", icon: Shield },
    ],
  },
  {
    label: "Connect",
    items: [
      { href: "/dashboard/integrations", label: "Integrations", icon: Link2 },
      { href: "/dashboard/inbox", label: "Social Inbox", icon: Inbox },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();
  const displayName = session?.user?.name ?? session?.user?.email?.split("@")[0] ?? "User";
  const initials = displayName.slice(0, 1).toUpperCase();

  return (
    <aside
      className={clsx(
        "flex flex-col h-screen border-r shrink-0 transition-all duration-200",
        "bg-[#0f172a] border-[#1e293b]",
        collapsed ? "w-14" : "w-56"
      )}
    >
      {/* Logo */}
      <div className={clsx(
        "flex items-center border-b border-[#1e293b] h-14 shrink-0",
        collapsed ? "justify-center px-0" : "px-4 gap-2"
      )}>
        <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-xs">S</span>
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold text-slate-100 tracking-tight flex-1">Sellora</span>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded hover:bg-[#1e293b] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="absolute left-14 top-4 z-50 w-5 h-5 bg-[#1e293b] border border-[#334155] rounded flex items-center justify-center text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {sections.map((section) => (
          <div key={section.label} className="mb-1">
            {!collapsed && (
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                {section.label}
              </p>
            )}
            {collapsed && <div className="my-1 mx-2 h-px bg-[#1e293b]" />}
            {section.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  title={collapsed ? label : undefined}
                  className={clsx(
                    "flex items-center gap-2.5 mx-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                    active
                      ? "bg-blue-600/20 text-blue-400"
                      : "text-slate-400 hover:bg-[#1e293b] hover:text-slate-200"
                  )}
                >
                  <Icon className={clsx("w-4 h-4 shrink-0", active ? "text-blue-400" : "")} />
                  {!collapsed && <span className="truncate">{label}</span>}
                  {!collapsed && active && (
                    <span className="ml-auto w-1 h-1 rounded-full bg-blue-400 shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      {!collapsed && (
        <div className="border-t border-[#1e293b] p-3 space-y-0.5">
          <Link href="/dashboard/settings" className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-slate-400 hover:bg-[#1e293b] hover:text-slate-200 transition-colors">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </Link>
          <Link href="/dashboard/help" className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-slate-400 hover:bg-[#1e293b] hover:text-slate-200 transition-colors">
            <HelpCircle className="w-4 h-4" />
            <span>Help & Guide</span>
          </Link>
          <div className="flex items-center gap-2 pt-2 border-t border-[#1e293b] mt-1">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-semibold">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-300 truncate">{displayName}</p>
              <p className="text-xs text-slate-600 truncate">Growth Plan</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
