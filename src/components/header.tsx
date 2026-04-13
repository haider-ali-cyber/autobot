"use client";
import { Bell, Search } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { data: session } = useSession();

  const displayName = session?.user?.name ?? session?.user?.email?.split("@")[0] ?? "User";
  const initials = displayName.slice(0, 1).toUpperCase();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/dashboard/product-hunter?q=${encodeURIComponent(search.trim())}`);
      setSearch("");
    }
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-5 gap-4 shrink-0">
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-gray-900 truncate">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
      </div>

      <form onSubmit={handleSearch} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 w-52 focus-within:border-blue-500 transition-colors">
        <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full"
        />
      </form>

      <button className="relative p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer">
        <Bell className="w-4 h-4" />
        <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full" />
      </button>

      <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-semibold">{initials}</span>
        </div>
        <span className="text-sm text-gray-700 hidden sm:block truncate max-w-[100px]">{displayName}</span>
      </div>
    </header>
  );
}
