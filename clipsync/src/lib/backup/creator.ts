/**
 * @module lib/backup/creator
 * @description 备份创建模块。
 *              提供全量备份、增量备份和手动备份功能。
 *              将用户剪贴板数据、设备信息和设置序列化为 BackupFile JSON 结构，
 *              计算 SHA-256 校验和，上传至 Supabase Storage，并在数据库中创建备份记录。
 * @author ClipSync Team
 * @created 2026-04-12
 */

import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors/app-error";
import type { Backup, BackupFile, BackupType } from "@/types/backup";

/**
 * 计算字符串内容的 SHA-256 校验和。
 *
 * 使用 Web Crypto API 的 crypto.subtle.digest 方法对 UTF-8 编码的文本内容
 * 进行 SHA-256 哈希运算，返回十六进制格式的校验和字符串。
 *
 * @param content - 需要计算校验和的文本内容
 * @returns 十六进制格式的 SHA-256 校验和字符串
 *
 * @example
 * ```typescript
 * const checksum = await computeChecksum("hello world");
 * // => "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
 * ```
 */
async function computeChecksum(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 创建用户数据备份。
 *
 * 根据备份类型获取用户数据，构建 BackupFile JSON 结构，计算 SHA-256 校验和，
 * 上传至 Supabase Storage 的 "backups" 存储桶，并在数据库中创建备份记录。
 *
 * 备份类型行为：
 * - **full**（全量备份）：获取用户所有剪贴板记录
 * - **incremental**（增量备份）：仅获取自上次备份以来修改的剪贴板记录
 * - **manual**（手动备份）：与全量备份相同，获取所有剪贴板记录
 *
 * @param userId - 当前登录用户的唯一标识
 * @param type - 备份类型，支持 "full"、"incremental" 或 "manual"
 * @returns 新创建的 Backup 数据库记录
 * @throws {AppError} 当获取剪贴板数据失败时抛出 BK_001 错误
 * @throws {AppError} 当上传备份文件到 Storage 失败时抛出 BK_001 错误
 * @throws {AppError} 当创建备份数据库记录失败时抛出 BK_001 错误
 *
 * @example
 * ```typescript
 * import { createBackup } from "@/lib/backup/creator";
 *
 * // 创建全量备份
 * const backup = await createBackup("user-123", "full");
 * console.log(backup.id, backup.fileUrl);
 *
 * // 创建增量备份
 * const incrementalBackup = await createBackup("user-123", "incremental");
 *
 * // 创建手动备份
 * const manualBackup = await createBackup("user-123", "manual");
 * ```
 */
export async function createBackup(
  userId: string,
  type: BackupType
): Promise<Backup> {
  const supabase = await createClient();
  const createdAt = new Date().toISOString();

  // 1. 根据备份类型获取剪贴板数据
  let clips: unknown[];

  if (type === "incremental") {
    // 增量备份：查询用户最近一次成功备份的时间，获取该时间之后修改的剪贴板
    const { data: lastBackup, error: lastBackupError } = await supabase
      .from("backups")
      .select("createdAt")
      .eq("userId", userId)
      .eq("status", "completed")
      .order("createdAt", { ascending: false })
      .limit(1)
      .single();

    if (lastBackupError && lastBackupError.code !== "PGRST116") {
      throw new AppError("BK_001", {
        message: `Failed to fetch last backup timestamp: ${lastBackupError.message}`,
        details: { userId, error: lastBackupError },
      });
    }

    const sinceDate = lastBackup?.createdAt ?? new Date(0).toISOString();

    const { data: clipsData, error: clipsError } = await supabase
      .from("clips")
      .select("*")
      .eq("userId", userId)
      .eq("isDeleted", false)
      .gte("updatedAt", sinceDate);

    if (clipsError) {
      throw new AppError("BK_001", {
        message: `Failed to fetch clips for incremental backup: ${clipsError.message}`,
        details: { userId, sinceDate, error: clipsError },
      });
    }

    clips = clipsData ?? [];
  } else {
    // 全量备份 / 手动备份：获取用户所有未删除的剪贴板
    const { data: clipsData, error: clipsError } = await supabase
      .from("clips")
      .select("*")
      .eq("userId", userId)
      .eq("isDeleted", false);

    if (clipsError) {
      throw new AppError("BK_001", {
        message: `Failed to fetch clips for full backup: ${clipsError.message}`,
        details: { userId, error: clipsError },
      });
    }

    clips = clipsData ?? [];
  }

  // 2. 获取设备信息
  const { data: devices, error: devicesError } = await supabase
    .from("devices")
    .select("*")
    .eq("userId", userId);

  if (devicesError) {
    throw new AppError("BK_001", {
      message: `Failed to fetch devices for backup: ${devicesError.message}`,
      details: { userId, error: devicesError },
    });
  }

  // 3. 获取用户设置
  const { data: settings, error: settingsError } = await supabase
    .from("user_settings")
    .select("*")
    .eq("userId", userId)
    .single();

  if (settingsError && settingsError.code !== "PGRST116") {
    throw new AppError("BK_001", {
      message: `Failed to fetch user settings for backup: ${settingsError.message}`,
      details: { userId, error: settingsError },
    });
  }

  // 4. 构建 BackupFile JSON 结构（不含 checksum，稍后计算）
  const backupFile: Omit<BackupFile, "checksum"> = {
    version: "1.0",
    type,
    userId,
    createdAt,
    data: {
      clips,
      devices: devices ?? [],
      settings: settings ?? {},
    },
  };

  // 5. 序列化并计算 SHA-256 校验和
  const jsonString = JSON.stringify(backupFile);
  const checksum = await computeChecksum(jsonString);

  // 6. 将校验和加入最终结构
  const finalBackupFile: BackupFile = {
    ...backupFile,
    checksum,
  };

  const finalJsonString = JSON.stringify(finalBackupFile);
  const fileBuffer = new TextEncoder().encode(finalJsonString);
  const fileSize = fileBuffer.byteLength;

  // 7. 上传到 Supabase Storage "backups" 存储桶
  const timestamp = createdAt.replace(/[:.]/g, "-").slice(0, 19);
  const filePath = `${userId}/${type}/${timestamp}.json`;

  const { error: uploadError } = await supabase.storage
    .from("backups")
    .upload(filePath, fileBuffer, {
      contentType: "application/json",
      upsert: false,
    });

  if (uploadError) {
    throw new AppError("BK_001", {
      message: `Failed to upload backup file to storage: ${uploadError.message}`,
      details: { userId, filePath, error: uploadError },
    });
  }

  // 8. 获取上传文件的公开 URL
  const { data: urlData } = supabase.storage
    .from("backups")
    .getPublicUrl(filePath);

  const fileUrl = urlData.publicUrl;

  // 9. 在数据库中创建备份记录
  const { data: backupRecord, error: insertError } = await supabase
    .from("backups")
    .insert({
      userId,
      type,
      fileUrl,
      fileSize,
      clipCount: clips.length,
      status: "completed",
      checksum,
    })
    .select()
    .single();

  if (insertError) {
    throw new AppError("BK_001", {
      message: `Failed to create backup record: ${insertError.message}`,
      details: { userId, type, error: insertError },
    });
  }

  return backupRecord as Backup;
}
