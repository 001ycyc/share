/**
 * @module lib/storage/cleanup
 * @description 自动清理引擎。
 *              提供过期剪贴板内容清理、回收站清理和孤立文件清理功能。
 *              所有数据库操作通过服务端 Supabase 客户端执行。
 * @author ClipSync Team
 * @created 2026-04-12
 */

import { createClient } from "@/lib/supabase/server";

/**
 * 清理过期的剪贴板内容。
 *
 * 将指定用户中超过指定天数的非收藏剪贴板条目标记为已删除（isDeleted=true）。
 * 收藏的剪贴板（isFavorite=true）不会被清理。
 *
 * @param userId - 用户 ID，用于限定清理范围
 * @param daysOld - 天数阈值，超过此天数的非收藏剪贴板将被标记为删除
 * @returns 包含清理数量的对象：
 *   - cleaned: 被标记为删除的剪贴板条目数
 *   - spaceFreed: 估计释放的存储空间（字节）
 *
 * @example
 * ```ts
 * const result = await cleanupExpiredClips("user-123", 30);
 * // result.cleaned === 15
 * // result.spaceFreed === 5242880
 * ```
 */
export async function cleanupExpiredClips(
  userId: string,
  daysOld: number
): Promise<{ cleaned: number; spaceFreed: number }> {
  const supabase = await createClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  // 查询超过指定天数且非收藏的剪贴板
  const { data: expiredClips, error: fetchError } = await supabase
    .from("clips")
    .select("id, fileSize")
    .eq("userId", userId)
    .eq("isDeleted", false)
    .eq("isFavorite", false)
    .lt("createdAt", cutoffDate.toISOString());

  if (fetchError) {
    throw new Error(`Failed to fetch expired clips: ${fetchError.message}`);
  }

  if (!expiredClips || expiredClips.length === 0) {
    return { cleaned: 0, spaceFreed: 0 };
  }

  const clipIds = expiredClips.map((clip) => clip.id);
  const spaceFreed = expiredClips.reduce(
    (sum, clip) => sum + (clip.fileSize || 0),
    0
  );

  // 批量标记为已删除
  const { error: updateError } = await supabase
    .from("clips")
    .update({ isDeleted: true })
    .in("id", clipIds);

  if (updateError) {
    throw new Error(`Failed to mark clips as deleted: ${updateError.message}`);
  }

  return {
    cleaned: expiredClips.length,
    spaceFreed,
  };
}

/**
 * 清理回收站中过期的剪贴板条目。
 *
 * 永久删除指定用户回收站中超过指定天数的剪贴板条目。
 * 回收站中的条目是指 isDeleted=true 的记录。
 *
 * @param userId - 用户 ID，用于限定清理范围
 * @param daysOld - 天数阈值，回收站中超过此天数的条目将被永久删除
 * @returns 包含清理数量的对象：
 *   - cleaned: 被永久删除的剪贴板条目数
 *   - spaceFreed: 估计释放的存储空间（字节）
 *
 * @example
 * ```ts
 * const result = await cleanupRecycleBin("user-123", 7);
 * // result.cleaned === 5
 * // result.spaceFreed === 1048576
 * ```
 */
export async function cleanupRecycleBin(
  userId: string,
  daysOld: number
): Promise<{ cleaned: number; spaceFreed: number }> {
  const supabase = await createClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  // 查询回收站中超过指定天数的剪贴板
  const { data: recycleBinClips, error: fetchError } = await supabase
    .from("clips")
    .select("id, fileSize, storagePath")
    .eq("userId", userId)
    .eq("isDeleted", true)
    .lt("updatedAt", cutoffDate.toISOString());

  if (fetchError) {
    throw new Error(
      `Failed to fetch recycle bin clips: ${fetchError.message}`
    );
  }

  if (!recycleBinClips || recycleBinClips.length === 0) {
    return { cleaned: 0, spaceFreed: 0 };
  }

  const clipIds = recycleBinClips.map((clip) => clip.id);
  const spaceFreed = recycleBinClips.reduce(
    (sum, clip) => sum + (clip.fileSize || 0),
    0
  );

  // 从 Storage 中删除关联文件
  const storagePaths = recycleBinClips
    .map((clip) => clip.storagePath)
    .filter((path): path is string => !!path);

  if (storagePaths.length > 0) {
    for (const path of storagePaths) {
      const { error: storageError } = await supabase.storage
        .from("clips")
        .remove([path]);

      if (storageError) {
        console.warn(`Failed to delete storage file ${path}: ${storageError.message}`);
      }
    }
  }

  // 从数据库中永久删除记录
  const { error: deleteError } = await supabase
    .from("clips")
    .delete()
    .in("id", clipIds);

  if (deleteError) {
    throw new Error(`Failed to permanently delete clips: ${deleteError.message}`);
  }

  return {
    cleaned: recycleBinClips.length,
    spaceFreed,
  };
}

/**
 * 清理孤立文件。
 *
 * 查找 Supabase Storage 中存在但数据库中没有对应记录的文件，并将其删除。
 * 这些孤立文件通常是由于上传中断或删除操作不完整而产生的。
 *
 * @returns 包含清理数量的对象：
 *   - cleaned: 被删除的孤立文件数
 *   - spaceFreed: 释放的存储空间（字节）
 *
 * @example
 * ```ts
 * const result = await cleanupOrphanFiles();
 * // result.cleaned === 3
 * // result.spaceFreed === 2097152
 * ```
 */
export async function cleanupOrphanFiles(): Promise<{
  cleaned: number;
  spaceFreed: number;
}> {
  const supabase = await createClient();

  let cleaned = 0;
  let spaceFreed = 0;

  // 列出 Storage 中的所有文件（根目录）
  const { data: storageFiles, error: listError } = await supabase.storage
    .from("clips")
    .list(undefined);

  if (listError) {
    throw new Error(`Failed to list storage files: ${listError.message}`);
  }

  if (!storageFiles || storageFiles.length === 0) {
    return { cleaned: 0, spaceFreed: 0 };
  }

  // 获取数据库中所有已知的存储路径
  const { data: dbClips, error: dbError } = await supabase
    .from("clips")
    .select("storagePath");

  if (dbError) {
    throw new Error(`Failed to fetch database clips: ${dbError.message}`);
  }

  const knownPaths = new Set(
    (dbClips || []).map((clip) => clip.storagePath).filter(Boolean)
  );

  // 找出孤立文件并删除
  for (const file of storageFiles) {
    const fullPath = file.id ?? ""; // Supabase Storage 使用 id 作为完整路径

    if (!knownPaths.has(fullPath)) {
      const { error: deleteError } = await supabase.storage
        .from("clips")
        .remove([fullPath]);

      if (!deleteError) {
        cleaned++;
        spaceFreed += file.metadata?.size || 0;
      } else {
        console.warn(
          `Failed to delete orphan file ${fullPath}: ${deleteError.message}`
        );
      }
    }
  }

  return { cleaned, spaceFreed };
}
