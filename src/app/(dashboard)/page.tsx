"use client";

import { useState, useEffect } from "react";
import { StatsGrid } from "@/components/layout/StatsGrid";
import { ClipList } from "@/components/clipboard/ClipList";
import { useClipboard } from "@/lib/hooks/useClipboard";
import { createClient } from "@/lib/supabase/client";
import type { UserStats } from "@/types/user";
import type { Device } from "@/types/device";

export default function DashboardPage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const { clips, isLoading: clipsLoading, handleToggleFavorite, handleCopy, handleDelete } = useClipboard();

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const userId = user.id;

        // 获取用户统计
        const { data: userData } = await supabase
          .from("users")
          .select("storageUsed, storageLimit")
          .eq("id", userId)
          .single();

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { count: todayClipCount } = await supabase
          .from("clips")
          .select("*", { count: "exact", head: true })
          .eq("userId", userId)
          .eq("isDeleted", false)
          .gte("createdAt", todayStart.toISOString());

        const { count: favoriteCount } = await supabase
          .from("clips")
          .select("*", { count: "exact", head: true })
          .eq("userId", userId)
          .eq("isDeleted", false)
          .eq("isFavorite", true);

        const { data: deviceData } = await supabase
          .from("devices")
          .select("*")
          .eq("userId", userId)
          .order("lastSyncAt", { ascending: false });

        setStats({
          todayClipCount: todayClipCount ?? 0,
          favoriteCount: favoriteCount ?? 0,
          syncedDeviceCount: deviceData?.filter(d => d.isOnline).length ?? 0,
          totalDeviceCount: deviceData?.length ?? 0,
          storageUsed: userData?.storageUsed ?? 0,
          storageLimit: userData?.storageLimit ?? 104857600,
        });
        setDevices((deviceData as Device[]) ?? []);
      } catch {
        // 静默失败，使用默认值
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">仪表盘</h1>
        <p className="text-muted-foreground">查看你的剪贴板使用概览</p>
      </div>
      <StatsGrid stats={stats} />
      <div>
        <h2 className="text-xl font-semibold mb-4">设备同步状态</h2>
        {devices.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground">
            暂无已连接设备
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {devices.map((device) => (
              <div key={device.id} className="rounded-xl border bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{device.name}</span>
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${device.isOnline ? "bg-green-500" : "bg-gray-400"}`} />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {device.isOnline ? "在线" : "离线"} · {device.platform}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-4">最近剪贴板</h2>
        <ClipList
          clips={clips.slice(0, 4)}
          isLoading={clipsLoading || loading}
          onToggleFavorite={handleToggleFavorite}
          onCopy={handleCopy}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
