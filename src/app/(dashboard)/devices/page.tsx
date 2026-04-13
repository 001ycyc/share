"use client";

import { useState, useEffect } from "react";
import { DeviceManager } from "@/components/sync/DeviceManager";
import { createClient } from "@/lib/supabase/client";
import type { Device } from "@/types/device";

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDevices() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("devices")
          .select("*")
          .eq("userId", user.id)
          .order("lastSyncAt", { ascending: false });

        if (!error) {
          setDevices((data as Device[]) ?? []);
        }
      } catch {
        // 静默失败
      } finally {
        setLoading(false);
      }
    }
    loadDevices();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">设备管理</h1>
        <p className="text-muted-foreground">管理你的已连接设备和同步状态</p>
      </div>
      <DeviceManager devices={devices} />
    </div>
  );
}
