/**
 * @module lib/backup/scheduler
 * @description 备份调度器模块。
 *              提供定时自动备份功能，支持每日增量备份和每周全量备份的计划任务。
 *              使用 setInterval 实现定时触发，支持立即执行和停止所有计划任务。
 * @author ClipSync Team
 * @created 2026-04-12
 */

import { createBackup } from "@/lib/backup/creator";
import type { Backup, BackupType } from "@/types/backup";

/**
 * 备份调度器类。
 *
 * 管理自动备份的定时任务，支持以下调度策略：
 * - **每日增量备份**：每 24 小时自动执行一次增量备份
 * - **每周全量备份**：每 7 天自动执行一次全量备份
 *
 * 每个调度器实例维护自己的定时器引用，支持独立启停。
 * 备份执行结果会通过 logResult 方法记录日志。
 *
 * @example
 * ```typescript
 * import { BackupScheduler } from "@/lib/backup/scheduler";
 *
 * const scheduler = new BackupScheduler("user-123");
 *
 * // 启动每日增量备份
 * scheduler.startDailyIncremental();
 *
 * // 启动每周全量备份
 * scheduler.startWeeklyFull();
 *
 * // 立即执行一次全量备份
 * await scheduler.runNow("user-123", "full");
 *
 * // 停止所有定时任务
 * scheduler.stopAll();
 * ```
 */
export class BackupScheduler {
  /** 当前调度用户 ID */
  private userId: string;

  /** 活跃的定时器引用列表 */
  private intervals: ReturnType<typeof setInterval>[];

  /**
   * 创建 BackupScheduler 实例。
   *
   * @param userId - 需要执行自动备份的用户唯一标识
   */
  constructor(userId: string) {
    this.userId = userId;
    this.intervals = [];
  }

  /**
   * 启动每日增量备份定时任务。
   *
   * 设置一个 24 小时（86400000 毫秒）间隔的定时器，
   * 定时触发增量备份。如果已存在活跃的定时器，会追加新的定时器。
   *
   * @returns void
   *
   * @example
   * ```typescript
   * const scheduler = new BackupScheduler("user-123");
   * scheduler.startDailyIncremental();
   * // 每 24 小时自动执行一次增量备份
   * ```
   */
  startDailyIncremental(): void {
    const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;

    const intervalId = setInterval(async () => {
      try {
        const backup = await createBackup(this.userId, "incremental");
        this.logResult(backup, true);
      } catch (error) {
        this.logResult(null, false, error as Error);
      }
    }, DAILY_INTERVAL_MS);

    this.intervals.push(intervalId);
  }

  /**
   * 启动每周全量备份定时任务。
   *
   * 设置一个 7 天（604800000 毫秒）间隔的定时器，
   * 定时触发全量备份。如果已存在活跃的定时器，会追加新的定时器。
   *
   * @returns void
   *
   * @example
   * ```typescript
   * const scheduler = new BackupScheduler("user-123");
   * scheduler.startWeeklyFull();
   * // 每 7 天自动执行一次全量备份
   * ```
   */
  startWeeklyFull(): void {
    const WEEKLY_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

    const intervalId = setInterval(async () => {
      try {
        const backup = await createBackup(this.userId, "full");
        this.logResult(backup, true);
      } catch (error) {
        this.logResult(null, false, error as Error);
      }
    }, WEEKLY_INTERVAL_MS);

    this.intervals.push(intervalId);
  }

  /**
   * 停止所有定时任务。
   *
   * 清除该调度器实例创建的所有活跃定时器，并清空定时器引用列表。
   * 调用后所有自动备份任务将停止，直到重新启动。
   *
   * @returns void
   *
   * @example
   * ```typescript
   * const scheduler = new BackupScheduler("user-123");
   * scheduler.startDailyIncremental();
   * scheduler.startWeeklyFull();
 *
   * // 稍后停止所有任务
   * scheduler.stopAll();
   * ```
   */
  stopAll(): void {
    for (const intervalId of this.intervals) {
      clearInterval(intervalId);
    }
    this.intervals = [];
  }

  /**
   * 立即触发一次备份。
   *
   * 不受定时器限制，立即为指定用户执行指定类型的备份。
   * 适用于用户手动触发或需要立即备份的场景。
   *
   * @param userId - 要执行备份的用户唯一标识
   * @param type - 备份类型，支持 "full" 或 "incremental"
   * @returns Promise<void>，无返回值
   *
   * @example
   * ```typescript
   * const scheduler = new BackupScheduler("user-123");
 *
   * // 立即执行一次全量备份
   * await scheduler.runNow("user-123", "full");
   *
   * // 立即执行一次增量备份
   * await scheduler.runNow("user-123", "incremental");
   * ```
   */
  async runNow(userId: string, type: "full" | "incremental"): Promise<void> {
    try {
      const backup = await createBackup(userId, type);
      this.logResult(backup, true);
    } catch (error) {
      this.logResult(null, false, error as Error);
    }
  }

  /**
   * 记录备份执行结果日志。
   *
   * 根据备份成功或失败输出相应的日志信息，包含备份 ID、类型和创建时间等关键信息。
   * 失败时会记录错误消息和堆栈信息。
   *
   * @param backup - 备份记录对象，成功时传入；失败时传入 null
   * @param success - 备份是否成功执行
   * @param error - 失败时的错误对象，可选
   * @returns void
   */
  private logResult(
    backup: Backup | null,
    success: boolean,
    error?: Error
  ): void {
    if (success && backup) {
      console.log(
        `[BackupScheduler] Backup completed successfully. ` +
          `ID: ${backup.id}, Type: ${backup.type}, ` +
          `Clips: ${backup.clipCount}, CreatedAt: ${backup.createdAt}`
      );
    } else {
      console.error(
        `[BackupScheduler] Backup failed. ` +
          `User: ${this.userId}, Error: ${error?.message ?? "Unknown error"}`,
        error?.stack
      );
    }
  }
}
