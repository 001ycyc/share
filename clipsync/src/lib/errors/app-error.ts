/**
 * @module lib/errors/app-error
 * @description ClipSync 统一应用错误类。
 *              继承原生 Error，提供结构化的错误码、严重级别和用户友好消息。
 *              所有业务逻辑抛出的错误都应使用此类的实例，以便全局错误处理器统一处理。
 * @author ClipSync Team
 * @created 2026-04-12
 */

import type { ErrorSeverity } from "@/types/error";

/**
 * AppError 构造选项接口。
 *
 * @property message - 自定义错误消息（开发者日志用），默认使用 DEFAULT_ERROR_MESSAGES 中的消息
 * @property severity - 错误严重级别，默认根据错误码自动推断
 * @property details - 错误附加详情数据，可用于调试或传递上下文信息
 */
export interface AppErrorOptions {
  message?: string;
  severity?: ErrorSeverity;
  details?: unknown;
}

/**
 * 默认错误消息映射表。
 * 包含所有 26 个错误码对应的中文用户提示消息。
 * 错误码分类：
 * - AUTH_001~004: 认证与授权相关错误
 * - CLIP_001~005: 剪贴板操作相关错误
 * - SYNC_001~004: 同步相关错误
 * - IE_001~004: 导入导出相关错误
 * - BK_001~003: 备份相关错误
 * - STORAGE_001~006: 存储相关错误
 * - SYS_001~003: 系统级错误
 */
export const DEFAULT_ERROR_MESSAGES: Record<string, string> = {
  // 认证与授权 (AUTH_001 - AUTH_004)
  AUTH_001: "登录已过期，请重新登录",
  AUTH_002: "账号或密码错误",
  AUTH_003: "没有操作权限，请联系管理员",
  AUTH_004: "账号已被禁用，请联系客服",

  // 剪贴板操作 (CLIP_001 - CLIP_005)
  CLIP_001: "剪贴板内容为空",
  CLIP_002: "不支持的剪贴板内容类型",
  CLIP_003: "剪贴板内容过大，请缩小后重试",
  CLIP_004: "剪贴板内容不存在或已被删除",
  CLIP_005: "剪贴板操作失败，请稍后重试",

  // 同步 (SYNC_001 - SYNC_004)
  SYNC_001: "同步失败，请检查网络连接后重试",
  SYNC_002: "同步冲突，请手动选择保留的版本",
  SYNC_003: "同步超时，请稍后重试",
  SYNC_004: "设备离线，无法同步",

  // 导入导出 (IE_001 - IE_004)
  IE_001: "文件格式不支持",
  IE_002: "导入失败，文件内容无效",
  IE_003: "导出失败，请稍后重试",
  IE_004: "文件大小超出限制",

  // 备份 (BK_001 - BK_003)
  BK_001: "备份创建失败",
  BK_002: "备份恢复失败",
  BK_003: "备份数据损坏",

  // 存储 (STORAGE_001 - STORAGE_006)
  STORAGE_001: "存储空间不足，请清理后重试",
  STORAGE_002: "文件上传失败，请检查网络后重试",
  STORAGE_003: "文件下载失败",
  STORAGE_004: "文件不存在或已被删除",
  STORAGE_005: "存储服务不可用，请稍后重试",
  STORAGE_006: "文件类型不允许上传",

  // 系统 (SYS_001 - SYS_003)
  SYS_001: "系统繁忙，请稍后重试",
  SYS_002: "服务维护中，请稍后访问",
  SYS_003: "未知系统错误",
};

/**
 * 根据错误码前缀推断默认严重级别。
 *
 * @param code - 错误码字符串
 * @returns 推断出的错误严重级别
 */
function inferSeverity(code: string): ErrorSeverity {
  const prefix = code.split("_")[0];
  switch (prefix) {
    case "AUTH":
      return "high";
    case "CLIP":
      return "medium";
    case "SYNC":
      return "medium";
    case "IE":
      return "medium";
    case "BK":
      return "high";
    case "STORAGE":
      return "medium";
    case "SYS":
      return "high";
    default:
      return "medium";
  }
}

/**
 * 统一应用错误类。
 *
 * 继承原生 Error，为 ClipSync 应用提供结构化的错误处理能力。
 * 每个错误实例包含错误码、严重级别、用户友好消息和可选的附加详情。
 *
 * @example
 * ```typescript
 * // 使用默认消息
 * throw new AppError("AUTH_001");
 *
 * // 自定义消息和严重级别
 * throw new AppError("CLIP_003", {
 *   message: "图片大小超过 10MB 限制",
 *   severity: "high",
 *   details: { fileSize: 15728640, maxSize: 10485760 },
 * });
 *
 * // 判断错误类别
 * if (error.isCategory("AUTH")) {
 *   // 跳转到登录页
 * }
 * ```
 */
export class AppError extends Error {
  /** 错误码标识符，格式为 "CATEGORY_XXX" */
  public readonly code: string;

  /** 错误严重级别 */
  public readonly severity: ErrorSeverity;

  /** 面向用户的中文提示消息 */
  public readonly userMessage: string;

  /** 错误附加详情数据 */
  public readonly details: unknown;

  /**
   * 创建 AppError 实例。
   *
   * @param code - 错误码标识符，如 "AUTH_001"、"CLIP_003"
   * @param options - 可选配置项
   * @param options.message - 自定义开发者日志消息，默认使用 DEFAULT_ERROR_MESSAGES 中的消息
   * @param options.severity - 自定义严重级别，默认根据错误码前缀自动推断
   * @param options.details - 错误附加详情，用于调试或传递上下文
   */
  constructor(code: string, options?: AppErrorOptions) {
    const userMessage =
      DEFAULT_ERROR_MESSAGES[code] ?? "发生了一个未知错误";
    const message = options?.message ?? userMessage;
    const severity = options?.severity ?? inferSeverity(code);

    super(message);

    this.name = "AppError";
    this.code = code;
    this.severity = severity;
    this.userMessage = userMessage;
    this.details = options?.details ?? null;

    // 维护原型链，确保 instanceof 正常工作
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * 判断当前错误是否属于指定类别。
   *
   * 错误类别由错误码的前缀决定，例如 "AUTH_001" 属于 "AUTH" 类别。
   *
   * @param category - 错误类别前缀，如 "AUTH"、"CLIP"、"SYNC" 等
   * @returns 如果错误码属于指定类别则返回 true，否则返回 false
   *
   * @example
   * ```typescript
   * const error = new AppError("AUTH_002");
   * error.isCategory("AUTH"); // true
   * error.isCategory("CLIP"); // false
   * ```
   */
  isCategory(category: string): boolean {
    return this.code.startsWith(category.toUpperCase() + "_");
  }
}
