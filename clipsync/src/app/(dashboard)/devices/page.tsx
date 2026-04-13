"use client";

import { DeviceManager } from "@/components/sync/DeviceManager";

export default function DevicesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">设备管理</h1>
        <p className="text-muted-foreground">管理你的已连接设备和同步状态</p>
      </div>

      <DeviceManager devices={[]} />
    </div>
  );
}
