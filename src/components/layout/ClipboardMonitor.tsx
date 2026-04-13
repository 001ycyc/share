"use client";

import { Monitor, MonitorOff } from "lucide-react";
import { useClipboardMonitor } from "@/lib/hooks/useClipboardMonitor";
import { useUIStore } from "@/stores/ui.store";
import { cn } from "@/lib/utils";

/**
 * 剪贴板自动捕获组件。
 *
 * 在 Dashboard 布局中渲染，包含：
 * - 调用 useClipboardMonitor 执行实际监听逻辑
 * - 右下角浮动开关按钮，可随时开启/关闭自动捕获
 * - 状态指示灯（绿色=监听中，灰色=已关闭）
 */
export function ClipboardMonitor() {
  // 执行监听逻辑
  useClipboardMonitor();

  const monitoring = useUIStore((s) => s.clipboardMonitoring);
  const toggle = useUIStore((s) => s.toggleClipboardMonitoring);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
      {/* 状态提示 */}
      {monitoring && (
        <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1.5 text-xs text-green-700 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          正在监听剪贴板
        </div>
      )}

      {/* 开关按钮 */}
      <button
        onClick={toggle}
        title={monitoring ? "关闭自动捕获" : "开启自动捕获"}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full shadow-lg border transition-all",
          monitoring
            ? "bg-green-500 border-green-400 text-white hover:bg-green-600"
            : "bg-gray-100 border-gray-200 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
        )}
      >
        {monitoring ? (
          <Monitor className="h-4.5 w-4.5" />
        ) : (
          <MonitorOff className="h-4.5 w-4.5" />
        )}
      </button>
    </div>
  );
}
