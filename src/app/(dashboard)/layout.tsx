"use client";

import { ClipboardMonitor } from "@/components/layout/ClipboardMonitor";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="pl-64">
        <TopBar />
        <main className="p-6">{children}</main>
      </div>
      {/* 全局剪贴板自动捕获 */}
      <ClipboardMonitor />
    </div>
  );
}
