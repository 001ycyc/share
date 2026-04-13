/**
 * @module types/error
 * @description 错误处理相关的 TypeScript 类型定义。
 *              定义了错误严重级别、错误码记录等核心类型，
 *              供 AppError、ErrorCodeManager 和全局错误处理器使用。
 * @author ClipSync Team
 * @created 2026-04-12
 */

/**
 * 错误严重级别枚举类型。
 * - `low`: 低级别错误，不影响核心功能，仅记录日志。
 * - `medium`: 中级别错误，部分功能受限，需用户注意。
 * - `high`: 高级别错误，核心功能不可用，需立即处理。
 * - `critical`: 严重错误，系统可能无法继续运行。
 */
export type ErrorSeverity = "low" | "medium" | "high" | "critical";

/**
 * 错误码记录接口。
 * 描述单个错误码的完整信息，包括错误码、用户消息、严重级别和描述。
 *
 * @property code - 唯一错误码标识符，格式为 "CATEGORY_XXX"（如 "AUTH_001"）
 * @property userMessage - 面向用户的中文提示信息
 * @property severity - 错误严重级别
 * @property description - 错误的详细技术描述（可选）
 */
export interface ErrorCodeRecord {
  code: string;
  userMessage: string;
  severity: ErrorSeverity;
  description?: string;
}
