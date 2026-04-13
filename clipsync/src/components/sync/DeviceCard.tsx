"use client";

import { Smartphone, Laptop, Monitor, Globe, Trash2 } from "lucide-react";
import type { Device, Platform } from "@/types/device";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const platformIcons: Record<Platform, typeof Smartphone> = {
  ios: Smartphone,
  android: Smartphone,
  windows: Monitor,
  macOS: Laptop,
  web: Globe,
};

const platformLabels: Record<Platform, string> = {
  ios: "iOS",
  android: "Android",
  windows: "Windows",
  macOS: "macOS",
  web: "Web",
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "刚刚";
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  return `${diffDays}天前`;
}

interface DeviceCardProps {
  device: Device;
  onRemove?: (id: string) => void;
}

export function DeviceCard({ device, onRemove }: DeviceCardProps) {
  const Icon = platformIcons[device.platform];
  const label = platformLabels[device.platform];

  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{device.name}</span>
            <span
              className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                device.isOnline ? "bg-green-500" : "bg-gray-400"
              }`}
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{label}</span>
            <span className="text-muted-foreground/50">·</span>
            <span>{formatRelativeTime(device.lastSyncAt)}</span>
          </div>
        </div>

        {device.platform !== "web" && onRemove && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onRemove(device.id)}
            aria-label={`移除 ${device.name}`}
          >
            <Trash2 className="size-4 text-muted-foreground" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
