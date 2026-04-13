/**
 * @module lib/errors/handler
 * @description 全局错误处理器模块。
 *              提供统一的错误处理入口，将各种类型的错误（AppError、原生 Error、未知类型）
 *              转换为标准化的 ErrorResult 输出，同时输出适当的日志信息。
 * @author ClipSync Team
 * @created 2026-04-12
 */

import type { ErrorSeverity } from "@/types/error";
import { AppError } from "./app-error";

/**
 * 标准化错误结果接口。
 * 全局错误处理器的返回类型，包含面向用户的消息、错误码和严重级别。
 *
 * @property userMessage - 面向用户的中文提示消息，用于界面展示
 * @property code - 错误码标识符，未知错误使用 "SYS_003"
 * @property severity - 错误严重级别
 */
export interface ErrorResult {
  userMessage: string;
  code: string;
  severity: ErrorSeverity;
}

/**
 * 全局错误处理函数。
 *
 * 接收任意类型的错误输入，将其标准化为 ErrorResult 对象。
 * 处理逻辑：
 * 1. **AppError 实例**：直接提取其结构化信息，输出 warning 级别日志。
 * 2. **原生 Error 实例**：提取 message 属性，使用 "SYS_001" 作为错误码，输出 error 级别日志。
 * 3. **未知类型**：转换为字符串描述，使用 "SYS_003" 作为错误码，输出 error 级别日志。
 *
 * @param error - 捕获到的错误对象，可以是任意类型
 * @returns 标准化的 ErrorResult 对象
 *
 * @example
 * ```typescript
 * import { handleError } from "@/lib/errors/handler";
 * import { AppError } from "@/lib/errors/app-error";
 *
 * try {
 *   await someOperation();
 * } catch (error) {
 *   const result = handleError(error);
 *   // result.userMessage => "登录已过期，请重新登录"
 *   // result.code => "AUTH_001"
 *   // result.severity => "high"
 *   toast.error(result.userMessage);
 * }
 * ```
 */
export function handleError(error: unknown): ErrorResult {
  if (error instanceof AppError) {
    // AppError: 已知的业务错误，输出 warning 级别日志
    console.warn(
      `[AppError] ${error.code}: ${error.message}`,
      error.details ?? ""
    );
    return {
      userMessage: error.userMessage,
      code: error.code,
      severity: error.severity,
    };
  }

  if (error instanceof Error) {
    // 原生 Error: 已知为错误对象但非 AppError，输出 error 级别日志
    console.error(`[Error] ${error.message}`, error.stack ?? "");
    return {
      userMessage: "系统繁忙，请稍后重试",
      code: "SYS_001",
      severity: "high",
    };
  }

  // 未知类型: 无法识别的错误，输出 error 级别日志
  console.error("[UnknownError]", error);
  return {
    userMessage: "未知系统错误",
    code: "SYS_003",
    severity: "high",
  };
}
