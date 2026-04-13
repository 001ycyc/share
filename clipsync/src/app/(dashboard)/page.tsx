import { StatsGrid } from "@/components/layout/StatsGrid";

const devices = [
  { name: "当前设备 (Web)", status: "online", statusText: "当前设备" },
  { name: "iPhone 15 Pro", status: "online", statusText: "已同步" },
  { name: "Windows PC", status: "online", statusText: "已同步" },
  { name: "MacBook Pro", status: "offline", statusText: "离线" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">仪表盘</h1>
        <p className="text-muted-foreground">查看你的剪贴板使用概览</p>
      </div>

      {/* Stats Grid */}
      <StatsGrid stats={null} />

      {/* Device Sync Status */}
      <div>
        <h2 className="text-xl font-semibold mb-4">设备同步状态</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {devices.map((device) => (
            <div
              key={device.name}
              className="rounded-xl border bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{device.name}</span>
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${
                    device.status === "online" ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {device.statusText}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Clipboard */}
      <div>
        <h2 className="text-xl font-semibold mb-4">最近剪贴板</h2>
        <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground">
          开始复制粘贴内容，它们将显示在这里
        </div>
      </div>
    </div>
  );
}
