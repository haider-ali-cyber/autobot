"use client";
import { Sidebar } from "@/components/sidebar";
import { ChatWidget } from "@/components/chat-widget";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
      <ChatWidget />
    </div>
  );
}
