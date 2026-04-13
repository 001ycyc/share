"use client";

import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { createClip, purgeExpiredDeletedClips } from "@/lib/repository/clip.repository";
import { createClient } from "@/lib/supabase/client";
import { useUIStore } from "@/stores/ui.store";
import { useClipStore } from "@/stores/clip.store";
import type { ClipType } from "@/types/clip";

/**
 * 自动监听剪贴板变化并同步到数据库和界面。
 *
 * 使用 Clipboard API 的 `readText()` 定时轮询剪贴板内容，
 * 检测到变化时自动创建新的剪贴板记录并实时更新界面。
 *
 * - 默认每 1 秒检测一次
 * - 忽略与上次相同的内容（去重）
 * - 忽略空内容和过短内容（< 2 字符）
 * - 可通过 UI Store 的 clipboardMonitoring 开关控制
 * - 每小时自动清理回收站中超过 7 天的记录
 */

/** 检测间隔（毫秒） */
const POLL_INTERVAL = 1000;

/** 回收站清理间隔（毫秒）：1 小时 */
const PURGE_INTERVAL = 60 * 60 * 1000;

/** 回收站保留天数 */
const PURGE_RETENTION_DAYS = 7;

/** 根据内容判断类型 */
function detectType(text: string): ClipType {
  if (/^https?:\/\//i.test(text)) return "link";
  return "text";
}

/** 最小有效内容长度 */
const MIN_LENGTH = 2;

/** 获取当前用户 ID */
async function getUserId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export function useClipboardMonitor() {
  const lastContentRef = useRef<string>("");
  const isRunningRef = useRef(false);
  const monitoring = useUIStore((s) => s.clipboardMonitoring);
  const addClip = useClipStore((s) => s.addClip);

  const saveClip = useCallback(async (content: string) => {
    try {
      const userId = await getUserId();
      if (!userId) return;

      const type = detectType(content);
      const clip = await createClip(userId, {
        type,
        content,
        sourceDevice: "Web",
      });

      // 实时更新界面：将新记录插入列表顶部
      addClip(clip);

      // 只在内容较短时显示提示（避免复制大段代码时频繁弹窗）
      if (content.length < 200) {
        toast.success("已自动捕获剪贴板内容");
      }
    } catch {
      // 静默失败，不打扰用户
    }
  }, [addClip]);

  // 剪贴板监听
  useEffect(() => {
    if (!monitoring) {
      isRunningRef.current = false;
      return;
    }

    isRunningRef.current = true;

    const intervalId = setInterval(async () => {
      if (!isRunningRef.current) return;

      try {
        const text = await navigator.clipboard.readText();
        if (text === lastContentRef.current) return;
        if (!text || text.trim().length < MIN_LENGTH) return;

        lastContentRef.current = text;
        await saveClip(text);
      } catch {
        // clipboard.readText() 在没有焦点或权限不足时会失败，忽略
      }
    }, POLL_INTERVAL);

    return () => {
      isRunningRef.current = false;
      clearInterval(intervalId);
    };
  }, [monitoring, saveClip]);

  // 回收站自动清理：每小时检查一次，删除超过 7 天的记录
  useEffect(() => {
    const runPurge = async () => {
      try {
        const userId = await getUserId();
        if (!userId) return;
        const purged = await purgeExpiredDeletedClips(userId, PURGE_RETENTION_DAYS);
        if (purged > 0) {
          console.log(`[ClipboardMonitor] 已自动清理 ${purged} 条过期回收站记录`);
        }
      } catch {
        // 静默失败
      }
    };

    // 页面加载时立即执行一次
    runPurge();

    // 之后每小时执行一次
    const intervalId = setInterval(runPurge, PURGE_INTERVAL);
    return () => clearInterval(intervalId);
  }, []);
}
