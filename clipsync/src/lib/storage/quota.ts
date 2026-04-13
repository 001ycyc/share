/**
 * @module lib/storage/quota
 * @description 存储配额管理器。
 *              提供存储空间使用情况检查、上传权限判断和配额警告消息等功能。
 *              根据使用率百分比将配额级别划分为四个等级：normal、warning、critical、full。
 * @author ClipSync Team
 * @created 2026-04-12
 */

/**
 * 存储配额信息接口。
 *
 * 描述当前存储空间的使用情况，包括已用空间、总限额、使用百分比和配额级别。
 *
 * @property used - 已使用的存储空间（字节）
 * @property limit - 存储空间总限额（字节）
 * @property percentage - 已使用百分比（0-100）
 * @property level - 配额级别，分为 "normal" | "warning" | "critical" | "full"
 */
export interface StorageQuotaInfo {
  /** 已使用的存储空间（字节） */
  used: number;
  /** 存储空间总限额（字节） */
  limit: number;
  /** 已使用百分比（0-100） */
  percentage: number;
  /** 配额级别 */
  level: "normal" | "warning" | "critical" | "full";
}

/**
 * 检查存储配额并返回详细的配额信息。
 *
 * 根据已用空间和总限额计算使用百分比，并按以下阈值划分配额级别：
 * - normal: 使用率 < 80%
 * - warning: 使用率 >= 80% 且 < 90%
 * - critical: 使用率 >= 90% 且 < 95%
 * - full: 使用率 >= 95%
 *
 * @param used - 已使用的存储空间（字节），必须 >= 0
 * @param limit - 存储空间总限额（字节），必须 > 0
 * @returns 包含使用详情和配额级别的 {@link StorageQuotaInfo} 对象
 *
 * @example
 * ```ts
 * const quota = checkQuota(800, 1000);
 * // quota.percentage === 80
 * // quota.level === "warning"
 * ```
 */
export function checkQuota(used: number, limit: number): StorageQuotaInfo {
  const percentage = limit > 0 ? (used / limit) * 100 : 0;

  let level: StorageQuotaInfo["level"];

  if (percentage >= 95) {
    level = "full";
  } else if (percentage >= 90) {
    level = "critical";
  } else if (percentage >= 80) {
    level = "warning";
  } else {
    level = "normal";
  }

  return {
    used,
    limit,
    percentage: Math.round(percentage * 100) / 100,
    level,
  };
}

/**
 * 判断是否可以上传文件。
 *
 * 根据当前配额级别和文件类型决定是否允许上传：
 * - 当配额级别为 "full" 且上传类型为文件时，拒绝上传
 * - 当配额级别为 "critical" 或 "full" 时，拒绝上传
 * - 其他情况允许上传
 *
 * @param quota - 当前存储配额信息，由 {@link checkQuota} 生成
 * @param fileSize - 待上传文件的大小（字节）
 * @returns 如果允许上传返回 true，否则返回 false
 *
 * @example
 * ```ts
 * const quota = checkQuota(950, 1000);
 * const allowed = canUpload(quota, 1024);
 * // allowed === false (level is "full")
 * ```
 */
export function canUpload(quota: StorageQuotaInfo, fileSize: number): boolean {
  if (quota.level === "full" && fileSize > 0) {
    return false;
  }

  if (quota.level === "critical" || quota.level === "full") {
    return false;
  }

  return true;
}

/**
 * 根据配额级别返回对应的警告消息。
 *
 * 为每个配额级别提供用户友好的警告提示：
 * - normal: 无警告，返回 null
 * - warning: 提示存储空间即将不足
 * - critical: 提示存储空间严重不足，建议清理
 * - full: 提示存储空间已满，无法上传
 *
 * @param quota - 当前存储配额信息，由 {@link checkQuota} 生成
 * @returns 对应级别的警告消息字符串，如果级别为 normal 则返回 null
 *
 * @example
 * ```ts
 * const quota = checkQuota(850, 1000);
 * const message = getQuotaWarningMessage(quota);
 * // message === "存储空间即将不足，已使用 85%。建议清理不需要的文件。"
 * ```
 */
export function getQuotaWarningMessage(quota: StorageQuotaInfo): string | null {
  switch (quota.level) {
    case "normal":
      return null;
    case "warning":
      return `存储空间即将不足，已使用 ${quota.percentage}%。建议清理不需要的文件。`;
    case "critical":
      return `存储空间严重不足，已使用 ${quota.percentage}%。请立即清理文件以释放空间。`;
    case "full":
      return `存储空间已满（${quota.percentage}%），无法上传新文件。请清理后再试。`;
  }
}
