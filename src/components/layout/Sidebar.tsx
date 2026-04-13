"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Clipboard,
  Clock,
  Star,
  Trash2,
  Monitor,
  Download,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useUIStore } from "@/stores/ui.store";
import { useSyncStore } from "@/stores/sync.store";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/", label: "仪表盘", icon: Clipboard },
  { href: "/clips", label: "剪贴板历史", icon: Clock, badge: true },
  { href: "/favorites", label: "收藏", icon: Star, badge: true },
  { href: "/trash", label: "回收站", icon: Trash2 },
  { href: "/devices", label: "设备", icon: Monitor, badge: true },
  { href: "/import-export", label: "数据导出", icon: Download },
  { href: "/settings", label: "设置", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const devices = useSyncStore((s) => s.devices);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-full w-64 flex-col bg-brand-950 text-white transition-transform duration-300",
        !sidebarOpen && "-translate-x-full"
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600">
          <Clipboard className="h-5 w-5 text-white" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">ClipSync</span>
          <Badge className="bg-brand-600 text-white text-[10px] px-1.5 py-0">
            PRO
          </Badge>
        </div>
      </div>

      <Separator className="bg-brand-800" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-800 text-white"
                    : "text-brand-200 hover:bg-brand-900 hover:text-white"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="h-2 w-2 rounded-full bg-brand-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Connected Devices */}
        <div className="mt-8">
          <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-brand-400">
            已连接设备
          </h3>
          <div className="flex flex-col gap-2">
            {devices.length === 0 ? (
              <p className="px-3 text-xs text-brand-400">暂无设备</p>
            ) : (
              devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-brand-200"
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      device.isOnline ? "bg-green-400" : "bg-gray-500"
                    )}
                  />
                  <span className="truncate">{device.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </ScrollArea>

      {/* User Info */}
      <Separator className="bg-brand-800" />
      <div className="flex items-center gap-3 px-4 py-4">
        <Avatar size="sm">
          <AvatarImage src="/avatars/user.png" alt="用户头像" />
          <AvatarFallback className="bg-brand-700 text-white text-xs">
            U
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-white">用户</p>
          <p className="text-xs text-brand-400">Pro 计划</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-brand-300 hover:text-white hover:bg-brand-800"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  );
}
