/**
 * @module prisma/seed-error-codes
 * @description 错误码种子数据脚本。
 *              使用 PrismaClient 将所有 26 个错误码以 upsert 方式写入数据库，
 *              确保重复执行不会产生重复记录。
 * @author ClipSync Team
 * @created 2026-04-12
 */

import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

/**
 * 所有 26 个错误码的种子数据。
 * 分类：
 * - AUTH (4): 认证与授权
 * - CLIP (5): 剪贴板操作
 * - SYNC (4): 同步
 * - IE (4): 导入导出
 * - BK (3): 备份
 * - STORAGE (6): 存储
 * - SYS (3): 系统
 */
const errorCodes = [
  // ── 认证与授权 (AUTH_001 - AUTH_004) ──
  {
    code: "AUTH_001",
    category: "AUTH",
    name: "TOKEN_EXPIRED",
    description: "用户登录令牌已过期，需要重新认证",
    userMessage: "登录已过期，请重新登录",
    severity: "high",
  },
  {
    code: "AUTH_002",
    category: "AUTH",
    name: "INVALID_CREDENTIALS",
    description: "用户提供的账号或密码不正确",
    userMessage: "账号或密码错误",
    severity: "high",
  },
  {
    code: "AUTH_003",
    category: "AUTH",
    name: "FORBIDDEN",
    description: "用户没有执行该操作的权限",
    userMessage: "没有操作权限，请联系管理员",
    severity: "high",
  },
  {
    code: "AUTH_004",
    category: "AUTH",
    name: "ACCOUNT_DISABLED",
    description: "用户账号已被管理员禁用",
    userMessage: "账号已被禁用，请联系客服",
    severity: "high",
  },

  // ── 剪贴板操作 (CLIP_001 - CLIP_005) ──
  {
    code: "CLIP_001",
    category: "CLIP",
    name: "EMPTY_CONTENT",
    description: "剪贴板内容为空，无法执行操作",
    userMessage: "剪贴板内容为空",
    severity: "medium",
  },
  {
    code: "CLIP_002",
    category: "CLIP",
    name: "UNSUPPORTED_TYPE",
    description: "不支持的剪贴板内容类型",
    userMessage: "不支持的剪贴板内容类型",
    severity: "medium",
  },
  {
    code: "CLIP_003",
    category: "CLIP",
    name: "CONTENT_TOO_LARGE",
    description: "剪贴板内容超出大小限制",
    userMessage: "剪贴板内容过大，请缩小后重试",
    severity: "medium",
  },
  {
    code: "CLIP_004",
    category: "CLIP",
    name: "NOT_FOUND",
    description: "指定的剪贴板内容不存在或已被删除",
    userMessage: "剪贴板内容不存在或已被删除",
    severity: "medium",
  },
  {
    code: "CLIP_005",
    category: "CLIP",
    name: "OPERATION_FAILED",
    description: "剪贴板操作执行失败",
    userMessage: "剪贴板操作失败，请稍后重试",
    severity: "medium",
  },

  // ── 同步 (SYNC_001 - SYNC_004) ──
  {
    code: "SYNC_001",
    category: "SYNC",
    name: "SYNC_FAILED",
    description: "设备间同步失败，可能是网络问题",
    userMessage: "同步失败，请检查网络连接后重试",
    severity: "medium",
  },
  {
    code: "SYNC_002",
    category: "SYNC",
    name: "SYNC_CONFLICT",
    description: "多设备同步时发生数据冲突",
    userMessage: "同步冲突，请手动选择保留的版本",
    severity: "medium",
  },
  {
    code: "SYNC_003",
    category: "SYNC",
    name: "SYNC_TIMEOUT",
    description: "同步操作超时",
    userMessage: "同步超时，请稍后重试",
    severity: "medium",
  },
  {
    code: "SYNC_004",
    category: "SYNC",
    name: "DEVICE_OFFLINE",
    description: "目标设备当前处于离线状态，无法同步",
    userMessage: "设备离线，无法同步",
    severity: "medium",
  },

  // ── 导入导出 (IE_001 - IE_004) ──
  {
    code: "IE_001",
    category: "IE",
    name: "UNSUPPORTED_FORMAT",
    description: "导入或导出的文件格式不受支持",
    userMessage: "文件格式不支持",
    severity: "medium",
  },
  {
    code: "IE_002",
    category: "IE",
    name: "IMPORT_FAILED",
    description: "导入文件内容无效或解析失败",
    userMessage: "导入失败，文件内容无效",
    severity: "medium",
  },
  {
    code: "IE_003",
    category: "IE",
    name: "EXPORT_FAILED",
    description: "导出操作执行失败",
    userMessage: "导出失败，请稍后重试",
    severity: "medium",
  },
  {
    code: "IE_004",
    category: "IE",
    name: "FILE_TOO_LARGE",
    description: "导入导出的文件大小超出限制",
    userMessage: "文件大小超出限制",
    severity: "medium",
  },

  // ── 备份 (BK_001 - BK_003) ──
  {
    code: "BK_001",
    category: "BK",
    name: "CREATE_FAILED",
    description: "备份创建过程中发生错误",
    userMessage: "备份创建失败",
    severity: "high",
  },
  {
    code: "BK_002",
    category: "BK",
    name: "RESTORE_FAILED",
    description: "从备份恢复数据时发生错误",
    userMessage: "备份恢复失败",
    severity: "high",
  },
  {
    code: "BK_003",
    category: "BK",
    name: "DATA_CORRUPTED",
    description: "备份数据校验失败，数据可能已损坏",
    userMessage: "备份数据损坏",
    severity: "high",
  },

  // ── 存储 (STORAGE_001 - STORAGE_006) ──
  {
    code: "STORAGE_001",
    category: "STORAGE",
    name: "QUOTA_EXCEEDED",
    description: "用户存储空间已用尽",
    userMessage: "存储空间不足，请清理后重试",
    severity: "medium",
  },
  {
    code: "STORAGE_002",
    category: "STORAGE",
    name: "UPLOAD_FAILED",
    description: "文件上传失败，可能是网络或权限问题",
    userMessage: "文件上传失败，请检查网络后重试",
    severity: "medium",
  },
  {
    code: "STORAGE_003",
    category: "STORAGE",
    name: "DOWNLOAD_FAILED",
    description: "文件下载失败",
    userMessage: "文件下载失败",
    severity: "medium",
  },
  {
    code: "STORAGE_004",
    category: "STORAGE",
    name: "FILE_NOT_FOUND",
    description: "请求的文件不存在或已被删除",
    userMessage: "文件不存在或已被删除",
    severity: "medium",
  },
  {
    code: "STORAGE_005",
    category: "STORAGE",
    name: "SERVICE_UNAVAILABLE",
    description: "存储服务暂时不可用",
    userMessage: "存储服务不可用，请稍后重试",
    severity: "medium",
  },
  {
    code: "STORAGE_006",
    category: "STORAGE",
    name: "FILE_TYPE_NOT_ALLOWED",
    description: "上传的文件类型不在允许列表中",
    userMessage: "文件类型不允许上传",
    severity: "medium",
  },

  // ── 系统 (SYS_001 - SYS_003) ──
  {
    code: "SYS_001",
    category: "SYS",
    name: "INTERNAL_ERROR",
    description: "服务器内部错误，请求处理失败",
    userMessage: "系统繁忙，请稍后重试",
    severity: "high",
  },
  {
    code: "SYS_002",
    category: "SYS",
    name: "MAINTENANCE",
    description: "系统正在维护中，暂时无法提供服务",
    userMessage: "服务维护中，请稍后访问",
    severity: "high",
  },
  {
    code: "SYS_003",
    category: "SYS",
    name: "UNKNOWN_ERROR",
    description: "未知系统错误",
    userMessage: "未知系统错误",
    severity: "high",
  },
];

async function main() {
  console.log(`Seeding ${errorCodes.length} error codes...`);

  for (const ec of errorCodes) {
    await prisma.errorCode.upsert({
      where: { code: ec.code },
      update: {
        category: ec.category,
        name: ec.name,
        description: ec.description,
        userMessage: ec.userMessage,
        severity: ec.severity,
        isActive: true,
      },
      create: {
        code: ec.code,
        category: ec.category,
        name: ec.name,
        description: ec.description,
        userMessage: ec.userMessage,
        severity: ec.severity,
        isActive: true,
      },
    });
    console.log(`  Upserted ${ec.code} (${ec.name})`);
  }

  console.log("Error code seeding complete.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
