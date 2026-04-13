/**
 * @module lib/backup/restorer
 * @description 备份恢复模块。
 *              提供备份列表查询、备份预览和备份恢复功能。
 *              支持校验和验证以确保备份数据完整性，并可在恢复时跳过重复内容。
 * @author ClipSync Team
 * @created 2026-04-12
 */

import { createClient } from "@/lib/supabase/client";
import { AppError } from "@/lib/errors/app-error";
import type { Backup, BackupFile } from "@/types/backup";
import type { Clip } from "@/types/clip";

/**
 * 计算字符串内容的 SHA-256 校验和。
 *
 * 使用 Web Crypto API 的 crypto.subtle.digest 方法对 UTF-8 编码的文本内容
 * 进行 SHA-256 哈希运算，返回十六进制格式的校验和字符串。
 *
 * @param content - 需要计算校验和的文本内容
 * @returns 十六进制格式的 SHA-256 校验和字符串
 */
async function computeChecksum(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 获取用户的所有备份列表。
 *
 * 查询指定用户的所有备份记录，按创建时间降序排列，
 * 最新的备份排在最前面。
 *
 * @param userId - 当前登录用户的唯一标识
 * @returns 按创建时间降序排列的 Backup 数组
 * @throws {AppError} 当数据库查询失败时抛出 BK_002 错误
 *
 * @example
 * ```typescript
 * import { getBackupList } from "@/lib/backup/restorer";
 *
 * const backups = await getBackupList("user-123");
 * console.log(`共有 ${backups.length} 个备份`);
 * console.log(`最新备份: ${backups[0].createdAt}`);
 * ```
 */
export async function getBackupList(userId: string): Promise<Backup[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("backups")
    .select("*")
    .eq("userId", userId)
    .order("createdAt", { ascending: false });

  if (error) {
    throw new AppError("BK_002", {
      message: `Failed to fetch backup list: ${error.message}`,
      details: { userId, error },
    });
  }

  return (data as Backup[]) ?? [];
}

/**
 * 预览备份文件内容。
 *
 * 从 Supabase Storage 下载指定备份的 JSON 文件，解析并返回 BackupFile 结构，
 * 供用户在恢复前查看备份包含的数据摘要。
 *
 * @param backupId - 备份记录的唯一标识
 * @param userId - 当前登录用户的唯一标识，用于权限校验
 * @returns 解析后的 BackupFile 结构，包含版本、类型、用户 ID、创建时间和备份数据
 * @throws {AppError} 当备份记录不存在时抛出 BK_002 错误
 * @throws {AppError} 当下载备份文件失败时抛出 BK_002 错误
 * @throws {AppError} 当解析备份文件失败时抛出 BK_002 错误
 *
 * @example
 * ```typescript
 * import { previewBackup } from "@/lib/backup/restorer";
 *
 * const preview = await previewBackup("backup-456", "user-123");
 * console.log(`备份版本: ${preview.version}`);
 * console.log(`包含 ${preview.data.clips.length} 条剪贴板`);
 * console.log(`包含 ${preview.data.devices.length} 个设备`);
 * ```
 */
export async function previewBackup(
  backupId: string,
  userId: string
): Promise<BackupFile> {
  const supabase = createClient();

  // 1. 查询备份记录获取文件路径
  const { data: backup, error: fetchError } = await supabase
    .from("backups")
    .select("*")
    .eq("id", backupId)
    .eq("userId", userId)
    .single();

  if (fetchError) {
    throw new AppError("BK_002", {
      message: `Failed to fetch backup record: ${fetchError.message}`,
      details: { backupId, userId, error: fetchError },
    });
  }

  // 2. 从 fileUrl 中提取存储路径
  // fileUrl 格式: https://.../storage/v1/object/public/backups/{userId}/{type}/{timestamp}.json
  const url = new URL(backup.fileUrl);
  const pathParts = url.pathname.split("/public/");
  const storagePath = pathParts.length > 1 ? pathParts[1] : "";

  // 3. 从 Supabase Storage 下载备份文件
  const { data: fileData, error: downloadError } = await supabase.storage
    .from("backups")
    .download(storagePath);

  if (downloadError) {
    throw new AppError("BK_002", {
      message: `Failed to download backup file: ${downloadError.message}`,
      details: { backupId, storagePath, error: downloadError },
    });
  }

  // 4. 解析 JSON 内容
  const text = await fileData.text();
  let backupFile: BackupFile;

  try {
    backupFile = JSON.parse(text) as BackupFile;
  } catch (parseError) {
    throw new AppError("BK_002", {
      message: `Failed to parse backup file: ${(parseError as Error).message}`,
      details: { backupId, storagePath },
    });
  }

  return backupFile;
}

/**
 * 恢复备份文件中的数据。
 *
 * 从 Supabase Storage 下载指定备份的 JSON 文件，验证 SHA-256 校验和以确保数据完整性，
 * 然后遍历备份中的剪贴板条目并逐条插入数据库。
 *
 * 支持以下选项：
 * - **skipDuplicates**：当设置为 true 时，通过内容匹配跳过已存在的剪贴板条目，
 *   避免恢复过程中产生重复数据
 *
 * @param backupId - 备份记录的唯一标识
 * @param userId - 当前登录用户的唯一标识，用于权限校验
 * @param options - 恢复选项
 * @param options.skipDuplicates - 是否跳过重复内容，默认为 false
 * @returns 包含恢复计数和跳过计数的对象
 * @throws {AppError} 当备份记录不存在时抛出 BK_002 错误
 * @throws {AppError} 当下载备份文件失败时抛出 BK_002 错误
 * @throws {AppError} 当校验和不匹配时抛出 BK_003 错误（备份数据损坏）
 * @throws {AppError} 当解析备份文件失败时抛出 BK_002 错误
 * @throws {AppError} 当插入剪贴板记录失败时抛出 BK_002 错误
 *
 * @example
 * ```typescript
 * import { restoreBackup } from "@/lib/backup/restorer";
 *
 * // 恢复备份，跳过重复内容
 * const result = await restoreBackup("backup-456", "user-123", {
 *   skipDuplicates: true,
 * });
 * console.log(`恢复了 ${result.restored} 条，跳过了 ${result.skipped} 条`);
 * ```
 */
export async function restoreBackup(
  backupId: string,
  userId: string,
  options?: { skipDuplicates?: boolean }
): Promise<{ restored: number; skipped: number }> {
  const supabase = createClient();
  const skipDuplicates = options?.skipDuplicates ?? false;

  // 1. 查询备份记录获取文件路径
  const { data: backup, error: fetchError } = await supabase
    .from("backups")
    .select("*")
    .eq("id", backupId)
    .eq("userId", userId)
    .single();

  if (fetchError) {
    throw new AppError("BK_002", {
      message: `Failed to fetch backup record for restore: ${fetchError.message}`,
      details: { backupId, userId, error: fetchError },
    });
  }

  // 2. 从 fileUrl 中提取存储路径
  const url = new URL(backup.fileUrl);
  const pathParts = url.pathname.split("/public/");
  const storagePath = pathParts.length > 1 ? pathParts[1] : "";

  // 3. 从 Supabase Storage 下载备份文件
  const { data: fileData, error: downloadError } = await supabase.storage
    .from("backups")
    .download(storagePath);

  if (downloadError) {
    throw new AppError("BK_002", {
      message: `Failed to download backup file for restore: ${downloadError.message}`,
      details: { backupId, storagePath, error: downloadError },
    });
  }

  // 4. 解析 JSON 内容
  const text = await fileData.text();
  let backupFile: BackupFile;

  try {
    backupFile = JSON.parse(text) as BackupFile;
  } catch (parseError) {
    throw new AppError("BK_002", {
      message: `Failed to parse backup file for restore: ${(parseError as Error).message}`,
      details: { backupId, storagePath },
    });
  }

  // 5. 验证校验和：重新计算并比对
  const fileForChecksum: Omit<BackupFile, "checksum"> = {
    version: backupFile.version,
    type: backupFile.type,
    userId: backupFile.userId,
    createdAt: backupFile.createdAt,
    data: backupFile.data,
  };
  const jsonString = JSON.stringify(fileForChecksum);
  const computedChecksum = await computeChecksum(jsonString);

  if (computedChecksum !== backupFile.checksum) {
    throw new AppError("BK_003", {
      message: `Backup checksum mismatch: expected ${backupFile.checksum}, got ${computedChecksum}`,
      details: {
        backupId,
        expected: backupFile.checksum,
        computed: computedChecksum,
      },
    });
  }

  // 6. 如果需要跳过重复，获取用户现有剪贴板的内容集合
  let existingContents: Set<string> | null = null;

  if (skipDuplicates) {
    const { data: existingClips, error: existingError } = await supabase
      .from("clips")
      .select("content")
      .eq("userId", userId)
      .eq("isDeleted", false);

    if (existingError) {
      throw new AppError("BK_002", {
        message: `Failed to fetch existing clips for duplicate check: ${existingError.message}`,
        details: { userId, error: existingError },
      });
    }

    existingContents = new Set(
      (existingClips ?? []).map((clip: { content: string }) => clip.content)
    );
  }

  // 7. 遍历剪贴板条目，插入非重复记录
  let restored = 0;
  let skipped = 0;

  for (const clip of backupFile.data.clips as Clip[]) {
    // 跳过重复内容检查
    if (skipDuplicates && existingContents?.has(clip.content)) {
      skipped++;
      continue;
    }

    const { error: insertError } = await supabase.from("clips").insert({
      userId,
      type: clip.type,
      title: clip.title,
      content: clip.content,
      contentPreview: clip.contentPreview,
      fileUrl: clip.fileUrl ?? null,
      fileSize: clip.fileSize ?? null,
      mimeType: clip.mimeType ?? null,
      metadata: clip.metadata ?? null,
      sourceDevice: clip.sourceDevice,
      isFavorite: clip.isFavorite ?? false,
      isDeleted: false,
    });

    if (insertError) {
      throw new AppError("BK_002", {
        message: `Failed to restore clip: ${insertError.message}`,
        details: { clipId: clip.id, userId, error: insertError },
      });
    }

    restored++;

    // 更新已存在内容集合，防止同一备份内出现重复
    if (existingContents) {
      existingContents.add(clip.content);
    }
  }

  return { restored, skipped };
}
