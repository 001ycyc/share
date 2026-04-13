/**
 * @module lib/errors/error-codes
 * @description 错误码管理器模块。
 *              提供错误码的缓存管理、数据库加载和查询功能。
 *              使用单例模式确保全局只有一个错误码管理器实例。
 * @author ClipSync Team
 * @created 2026-04-12
 */

import type { ErrorCodeRecord } from "@/types/error";

/**
 * 从数据库获取错误码记录的函数类型。
 * 由调用方提供，使管理器与具体数据源解耦。
 *
 * @returns Promise<ErrorCodeRecord[]> - 数据库中所有错误码记录的数组
 */
export type FetchErrorCodesFn = () => Promise<ErrorCodeRecord[]>;

/**
 * 错误码管理器类（单例模式）。
 *
 * 负责管理错误码的缓存、加载和查询。支持从数据库批量加载错误码记录，
 * 并在内存中维护缓存以提高查询性能。
 *
 * @example
 * ```typescript
 * import { errorCodeManager } from "@/lib/errors/error-codes";
 *
 * // 从数据库加载错误码
 * await errorCodeManager.loadFromDatabase(async () => {
 *   const { data } = await supabase.from("error_codes").select("*");
 *   return data ?? [];
 * });
 *
 * // 获取用户消息
 * const msg = errorCodeManager.getUserMessage("AUTH_001");
 * // => "登录已过期，请重新登录"
 *
 * // 检查是否已加载
 * if (!errorCodeManager.isLoaded()) {
 *   await errorCodeManager.loadFromDatabase(fetchFn);
 * }
 * ```
 */
class ErrorCodeManager {
  /** 错误码记录缓存，键为错误码字符串 */
  private cache: Map<string, ErrorCodeRecord>;

  /** 标记缓存是否已从数据库加载 */
  private loaded: boolean;

  /** 单例实例引用 */
  private static instance: ErrorCodeManager | null = null;

  /**
   * 私有构造函数，防止外部直接实例化。
   * 通过 getInstance() 或导出的 errorCodeManager 获取实例。
   */
  private constructor() {
    this.cache = new Map();
    this.loaded = false;
  }

  /**
   * 获取 ErrorCodeManager 单例实例。
   *
   * @returns ErrorCodeManager 单例实例
   */
  public static getInstance(): ErrorCodeManager {
    if (!ErrorCodeManager.instance) {
      ErrorCodeManager.instance = new ErrorCodeManager();
    }
    return ErrorCodeManager.instance;
  }

  /**
   * 从数据库加载错误码记录到缓存中。
   *
   * 使用提供的 fetchFn 从数据源获取所有错误码记录，
   * 并将其存入内存缓存。重复调用会覆盖已有缓存。
   *
   * @param fetchFn - 异步获取错误码记录的函数
   * @returns Promise<void>
   *
   * @example
   * ```typescript
   * await errorCodeManager.loadFromDatabase(async () => {
   *   const response = await fetch("/api/error-codes");
   *   return response.json();
   * });
   * ```
   */
  public async loadFromDatabase(fetchFn: FetchErrorCodesFn): Promise<void> {
    const records = await fetchFn();
    this.cache.clear();
    for (const record of records) {
      this.cache.set(record.code, record);
    }
    this.loaded = true;
  }

  /**
   * 根据错误码获取完整的错误码记录。
   *
   * @param code - 错误码标识符，如 "AUTH_001"
   * @returns 对应的 ErrorCodeRecord，若不存在则返回 undefined
   */
  public getByCode(code: string): ErrorCodeRecord | undefined {
    return this.cache.get(code);
  }

  /**
   * 根据错误码获取面向用户的中文提示消息。
   *
   * @param code - 错误码标识符，如 "AUTH_001"
   * @param fallback - 当错误码不存在时的备用消息，默认为 "发生了一个未知错误"
   * @returns 对应的用户提示消息字符串
   */
  public getUserMessage(code: string, fallback?: string): string {
    const record = this.cache.get(code);
    return record?.userMessage ?? fallback ?? "发生了一个未知错误";
  }

  /**
   * 更新或新增缓存中的单条错误码记录。
   *
   * @param record - 要更新的错误码记录
   */
  public updateCache(record: ErrorCodeRecord): void {
    this.cache.set(record.code, record);
  }

  /**
   * 获取缓存中所有错误码记录。
   *
   * @returns 缓存中所有 ErrorCodeRecord 的数组
   */
  public getAll(): ErrorCodeRecord[] {
    return Array.from(this.cache.values());
  }

  /**
   * 检查错误码缓存是否已从数据库加载。
   *
   * @returns 如果缓存已加载则返回 true，否则返回 false
   */
  public isLoaded(): boolean {
    return this.loaded;
  }
}

/**
 * 错误码管理器单例实例。
 * 全局共享的错误码管理入口。
 */
export const errorCodeManager = ErrorCodeManager.getInstance();
