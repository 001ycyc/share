import { Clipboard, Star, Monitor, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserStats } from "@/types/user";

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals));
  return `${value} ${sizes[i]}`;
}

const statsConfig = [
  {
    key: "todayClipCount" as const,
    label: "今日剪贴",
    icon: Clipboard,
    color: "brand",
    suffix: "条",
  },
  {
    key: "favoriteCount" as const,
    label: "收藏内容",
    icon: Star,
    color: "amber",
    suffix: "条",
  },
  {
    key: "syncedDeviceCount" as const,
    label: "同步设备",
    icon: Monitor,
    color: "green",
    suffix: "台",
  },
  {
    key: "storageUsed" as const,
    label: "存储空间",
    icon: HardDrive,
    color: "purple",
    suffix: "",
    format: true,
  },
];

const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
  brand: {
    bg: "bg-brand-50",
    icon: "text-brand-600",
    text: "text-brand-700",
  },
  amber: {
    bg: "bg-amber-50",
    icon: "text-amber-600",
    text: "text-amber-700",
  },
  green: {
    bg: "bg-green-50",
    icon: "text-green-600",
    text: "text-green-700",
  },
  purple: {
    bg: "bg-purple-50",
    icon: "text-purple-600",
    text: "text-purple-700",
  },
};

interface StatsGridProps {
  stats: UserStats | null;
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statsConfig.map((item) => {
        const colors = colorMap[item.color];
        const value = stats?.[item.key] ?? 0;
        const displayValue = item.format
          ? formatBytes(value)
          : String(value);

        return (
          <div
            key={item.key}
            className="flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm"
          >
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
                colors.bg
              )}
            >
              <item.icon className={cn("h-6 w-6", colors.icon)} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className={cn("text-2xl font-bold", colors.text)}>
                {displayValue}
                {item.suffix && (
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    {item.suffix}
                  </span>
                )}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
