/**
 * @module lib/sync/realtime
 * @description 实时订阅管理器。
 *              基于 Supabase Realtime 的 postgres_changes 频道，监听 clips 表的
 *              INSERT / UPDATE / DELETE 事件，并在回调中通知调用方，实现多设备间
 *              剪贴板数据的实时同步。
 * @author ClipSync Team
 * @created 2026-04-12
 */

import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * 剪贴板条目的轻量表示，用于 Realtime 事件 payload。
 *
 * Supabase postgres_changes 的 payload.new / payload.old 只包含触发变更的行数据，
 * 因此这里使用 `Record<string, unknown>` 来兼容完整 Clip 字段及部分字段。
 */
export type ClipPayload = Record<string, unknown>;

/**
 * 订阅回调集合。
 *
 * 每个回调接收从 Supabase Realtime 事件中提取的 payload 数据：
 * - `onInsert` — 新记录插入时触发，参数为 `payload.new`
 * - `onUpdate` — 记录更新时触发，参数为 `payload.new`
 * - `onDelete` — 记录删除时触发，参数为 `payload.old`
 */
export interface RealtimeCallbacks {
  /** 新增剪贴板条目时的回调 */
  onInsert: (payload: ClipPayload) => void;
  /** 更新剪贴板条目时的回调 */
  onUpdate: (payload: ClipPayload) => void;
  /** 删除剪贴板条目时的回调 */
  onDelete: (payload: ClipPayload) => void;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * 订阅指定用户的 clips 表实时变更。
 *
 * 创建一个 Supabase Realtime 频道，通过 `postgres_changes` 过滤当前用户的
 * INSERT / UPDATE / DELETE 事件。当事件到达时，分别调用 `callbacks` 中对应的
 * 回调函数，将 `payload.new`（INSERT / UPDATE）或 `payload.old`（DELETE）
 * 传递给调用方。
 *
 * @param userId - 当前登录用户的唯一标识，用于过滤只属于该用户的变更
 * @param callbacks - 包含 onInsert / onUpdate / onDelete 三个回调的对象
 * @returns 已订阅的 {@link RealtimeChannel} 实例，可用于后续取消订阅
 *
 * @example
 * ```ts
 * const channel = subscribeToClips(user.id, {
 *   onInsert: (payload) => console.log("新增:", payload),
 *   onUpdate: (payload) => console.log("更新:", payload),
 *   onDelete: (payload) => console.log("删除:", payload),
 * });
 *
 * // 稍后取消订阅
 * unsubscribe(channel);
 * ```
 */
export function subscribeToClips(
  userId: string,
  callbacks: RealtimeCallbacks
): RealtimeChannel {
  const supabase = createClient();

  const channel = supabase
    .channel(`clips-realtime:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "clips",
        filter: `userId=eq.${userId}`,
      },
      (payload) => {
        callbacks.onInsert(payload.new as ClipPayload);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "clips",
        filter: `userId=eq.${userId}`,
      },
      (payload) => {
        callbacks.onUpdate(payload.new as ClipPayload);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "clips",
        filter: `userId=eq.${userId}`,
      },
      (payload) => {
        callbacks.onDelete(payload.old as ClipPayload);
      }
    )
    .subscribe();

  return channel;
}

/**
 * 取消实时订阅。
 *
 * 调用 Supabase 的 `channel.unsubscribe()` 方法移除频道订阅，释放底层
 * WebSocket 资源。通常在组件卸载或用户登出时调用。
 *
 * @param channel - 之前由 {@link subscribeToClips} 返回的频道实例
 *
 * @example
 * ```ts
 * const channel = subscribeToClips(user.id, callbacks);
 * // ... 组件生命周期结束时
 * unsubscribe(channel);
 * ```
 */
export function unsubscribe(channel: RealtimeChannel): void {
  channel.unsubscribe();
}
