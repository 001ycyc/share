/**
 * @module lib/sync/conflict
 * @description 数据冲突解决策略。
 *              提供基于"最后写入胜出"（Last-Write-Wins, LWW）的冲突解决机制，
 *              通过比较 `updatedAt` 时间戳决定保留哪一份数据。同时提供
 *              字段级别的合并工具，将传入数据安全地合并到现有记录中。
 * @author ClipSync Team
 * @created 2026-04-12
 */

import type { Clip } from "@/types/clip";

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * 带有 updatedAt 时间戳的记录，用于冲突比较。
 */
export interface TimestampedRecord {
  /** 最后更新时间（ISO 8601 字符串） */
  updatedAt: string;
}

/**
 * 冲突解决结果：保留哪一方数据。
 *
 * - `"existing"` — 保留现有（本地）数据
 * - `"incoming"` — 采用传入（远端）数据
 */
export type ConflictResolution = "existing" | "incoming";

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * 解决数据冲突（Last-Write-Wins）。
 *
 * 比较现有记录和传入记录的 `updatedAt` 时间戳：
 * - 如果 `incoming.updatedAt` 更新（时间戳更大），返回 `"incoming"`
 * - 否则（包括时间戳相等的情况），返回 `"existing"`
 *
 * 该策略确保在多设备并发编辑场景下，总是保留最新的修改。
 *
 * @param existing - 现有（通常是本地）记录，需包含 updatedAt 字段
 * @param incoming - 传入（通常是远端）记录，需包含 updatedAt 字段
 * @returns 冲突解决结果，指示应保留哪一方数据
 *
 * @example
 * ```ts
 * const local = { updatedAt: "2026-04-12T10:00:00Z" };
 * const remote = { updatedAt: "2026-04-12T10:05:00Z" };
 *
 * const result = resolveConflict(local, remote);
 * console.log(result); // "incoming" — 远端更新，应采用远端数据
 * ```
 */
export function resolveConflict(
  existing: TimestampedRecord,
  incoming: TimestampedRecord
): ConflictResolution {
  const existingTime = new Date(existing.updatedAt).getTime();
  const incomingTime = new Date(incoming.updatedAt).getTime();

  return incomingTime > existingTime ? "incoming" : "existing";
}

/**
 * 合并剪贴板数据。
 *
 * 将传入的部分数据（`incoming`）合并到现有剪贴板记录（`existing`）中。
 * 合并策略如下：
 *
 * 1. 以 `existing` 作为基础副本
 * 2. 将 `incoming` 中所有非 undefined 的字段覆盖到基础副本上
 * 3. 比较双方的 `updatedAt` 时间戳，保留较新的时间戳
 *
 * 合并后的结果始终包含完整的 {@link Clip} 字段，可直接写入数据库或更新本地状态。
 *
 * @param existing - 现有的完整剪贴板记录
 * @param incoming - 传入的部分剪贴板数据，字段均为可选
 * @returns 合并后的完整剪贴板记录
 *
 * @example
 * ```ts
 * const existing: Clip = {
 *   id: "clip-1",
 *   userId: "user-1",
 *   type: "text",
 *   title: "旧标题",
 *   content: "旧内容",
 *   contentPreview: "旧内容",
 *   fileUrl: null,
 *   fileSize: null,
 *   mimeType: null,
 *   metadata: null,
 *   sourceDevice: "device-a",
 *   isFavorite: false,
 *   isDeleted: false,
 *   createdAt: "2026-04-12T09:00:00Z",
 *   updatedAt: "2026-04-12T09:00:00Z",
 * };
 *
 * const incoming = {
 *   title: "新标题",
 *   content: "新内容",
 *   updatedAt: "2026-04-12T10:00:00Z",
 * };
 *
 * const merged = mergeClipData(existing, incoming);
 * console.log(merged.title);    // "新标题"
 * console.log(merged.content);  // "新内容"
 * console.log(merged.userId);   // "user-1" — 保留原有字段
 * ```
 */
export function mergeClipData(
  existing: Clip,
  incoming: Partial<Clip>
): Clip {
  // 过滤掉 incoming 中值为 undefined 的字段
  const incomingFields = Object.fromEntries(
    Object.entries(incoming).filter(([, value]) => value !== undefined)
  );

  // 基础合并：existing 为底，incoming 字段覆盖
  const merged = { ...existing, ...incomingFields } as Clip;

  // 确保 updatedAt 保留较新的时间戳
  const resolution = resolveConflict(existing, {
    updatedAt: incoming.updatedAt ?? existing.updatedAt,
  });

  if (resolution === "incoming" && incoming.updatedAt) {
    merged.updatedAt = incoming.updatedAt;
  }

  return merged;
}
