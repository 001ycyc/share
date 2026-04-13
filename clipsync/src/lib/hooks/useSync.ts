"use client";

/**
 * @module lib/hooks/useSync
 * @description 实时同步 React Hook。
 *              封装了 Supabase Realtime 订阅、离线队列处理和同步状态管理，
 *              为组件提供开箱即用的同步能力。在组件挂载时自动建立 Realtime 连接，
 *              卸载时自动清理；同时暴露手动处理离线队列的方法。
 * @author ClipSync Team
 * @created 2026-04-12
 */

import { useEffect, useRef, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useSyncStore } from "@/stores/sync.store";
import { useClipStore } from "@/stores/clip.store";
import { subscribeToClips, unsubscribe } from "@/lib/sync/realtime";
import { OfflineQueue } from "@/lib/sync/offline-queue";
import { resolveConflict, mergeClipData } from "@/lib/sync/conflict";
import { createClient } from "@/lib/supabase/client";
import type { Clip } from "@/types/clip";

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * useSync hook 的返回值接口。
 */
export interface UseSyncReturn {
  /** 是否已连接到 Supabase Realtime 服务 */
  isConnected: boolean;
  /** 上次同步完成的时间（ISO 字符串），null 表示从未同步 */
  lastSyncAt: string | null;
  /** 当前同步状态 */
  syncStatus: "synced" | "syncing" | "offline" | "error";
  /** 手动处理离线队列中的待同步操作 */
  processOfflineQueue: () => Promise<void>;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * 实时同步 Hook。
 *
 * 在组件挂载时：
 * 1. 通过 Supabase Realtime 订阅当前用户的 clips 表变更
 * 2. 监听 INSERT / UPDATE / DELETE 事件并自动更新本地 clip store
 * 3. 更新同步状态为 "synced"
 *
 * 在组件卸载时自动取消 Realtime 订阅，释放资源。
 *
 * 同时提供 `processOfflineQueue` 方法，用于在网络恢复后手动触发离线队列的重放。
 * 重放过程中会使用冲突解决策略（Last-Write-Wins）处理服务端返回的数据。
 *
 * @returns 包含同步状态和离线队列处理方法的对象
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { isConnected, lastSyncAt, syncStatus, processOfflineQueue } = useSync();
 *
 *   return (
 *     <div>
 *       <p>连接状态: {isConnected ? "已连接" : "未连接"}</p>
 *       <p>同步状态: {syncStatus}</p>
 *       <button onClick={processOfflineQueue}>同步离线数据</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSync(): UseSyncReturn {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const queueRef = useRef<OfflineQueue | null>(null);

  // ── Store selectors ─────────────────────────────────────────────────────
  const isConnected = useSyncStore(
    (state) => state.syncStatus === "synced" || state.syncStatus === "syncing"
  );
  const lastSyncAt = useSyncStore((state) => state.lastSyncAt);
  const syncStatus = useSyncStore((state) => state.syncStatus);
  const setSyncStatus = useSyncStore((state) => state.setSyncStatus);
  const setLastSync = useSyncStore((state) => state.setLastSync);
  const setSyncing = useSyncStore((state) => state.setSyncing);
  const setOfflineQueueCount = useSyncStore(
    (state) => state.setOfflineQueueCount
  );

  // ── Clip store actions ─────────────────────────────────────────────────
  const addClip = useClipStore((state) => state.addClip);
  const updateClip = useClipStore((state) => state.updateClip);
  const removeClip = useClipStore((state) => state.removeClip);
  const clips = useClipStore((state) => state.clips);

  // ── Lazy initialization of OfflineQueue ────────────────────────────────
  const getQueue = useCallback(() => {
    if (!queueRef.current) {
      queueRef.current = new OfflineQueue();
    }
    return queueRef.current;
  }, []);

  // ── Subscribe / Unsubscribe ────────────────────────────────────────────
  useEffect(() => {
    // 获取当前用户 ID
    let userId: string | null = null;

    async function initSubscription() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSyncStatus("offline");
        return;
      }

      userId = user.id;

      // 更新离线队列计数
      const queue = getQueue();
      const count = await queue.getCount();
      setOfflineQueueCount(count);

      // 建立 Realtime 订阅
      channelRef.current = subscribeToClips(userId, {
        onInsert: (payload) => {
          addClip(payload as unknown as Clip);
          setLastSync(new Date().toISOString());
          setSyncStatus("synced");
        },
        onUpdate: (payload) => {
          const incoming = payload as unknown as Partial<Clip>;
          const existing = clips.find((c) => c.id === incoming.id);

          if (existing) {
            const resolution = resolveConflict(existing, {
              updatedAt: incoming.updatedAt ?? existing.updatedAt,
            });

            if (resolution === "incoming") {
              const merged = mergeClipData(existing, incoming);
              updateClip(merged.id, merged);
            }
          }

          setLastSync(new Date().toISOString());
          setSyncStatus("synced");
        },
        onDelete: (payload) => {
          const deleted = payload as unknown as Clip;
          removeClip(deleted.id);
          setLastSync(new Date().toISOString());
          setSyncStatus("synced");
        },
      });

      setSyncStatus("synced");
    }

    initSubscription();

    // 清理：组件卸载时取消订阅
    return () => {
      if (channelRef.current) {
        unsubscribe(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [
    addClip,
    updateClip,
    removeClip,
    clips,
    getQueue,
    setSyncStatus,
    setLastSync,
    setOfflineQueueCount,
  ]);

  // ── Process offline queue ──────────────────────────────────────────────
  const processOfflineQueue = useCallback(async () => {
    const queue = getQueue();
    const actions = await queue.dequeueAll();

    if (actions.length === 0) {
      return;
    }

    setSyncing(true);
    setSyncStatus("syncing");

    const supabase = createClient();

    try {
      for (const action of actions) {
        switch (action.type) {
          case "create": {
            const data = action.data as Omit<Clip, "id" | "createdAt" | "updatedAt">;
            await supabase.from("clips").insert(data);
            break;
          }
          case "update": {
            const data = action.data as Partial<Clip> & { id: string };
            const { id, ...updates } = data;
            await supabase.from("clips").update(updates).eq("id", id);
            break;
          }
          case "delete": {
            const data = action.data as { id: string };
            await supabase.from("clips").update({ isDeleted: true }).eq("id", data.id);
            break;
          }
        }
      }

      setLastSync(new Date().toISOString());
      setSyncStatus("synced");
      setOfflineQueueCount(0);
    } catch {
      // 重放失败，将未处理操作重新入队
      for (const action of actions) {
        await queue.enqueue(action);
      }
      setSyncStatus("error");
    } finally {
      setSyncing(false);
    }
  }, [getQueue, setSyncing, setSyncStatus, setLastSync, setOfflineQueueCount]);

  return {
    isConnected,
    lastSyncAt,
    syncStatus,
    processOfflineQueue,
  };
}
