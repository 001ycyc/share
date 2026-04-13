"use client";

import type { Device } from "@/types/device";
import { DeviceCard } from "@/components/sync/DeviceCard";
import { Monitor } from "lucide-react";

interface DeviceManagerProps {
  devices: Device[];
  onRemove?: (id: string) => void;
}

export function DeviceManager({ devices, onRemove }: DeviceManagerProps) {
  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Monitor className="size-6 text-muted-foreground" />
        </div>
        <p className="mt-4 font-medium text-muted-foreground">暂无已连接设备</p>
        <p className="mt-1 text-sm text-muted-foreground/70">
          在其他设备上登录 ClipSync 后，它们将显示在这里
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {devices.map((device) => (
        <DeviceCard key={device.id} device={device} onRemove={onRemove} />
      ))}
    </div>
  );
}
