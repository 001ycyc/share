/**
 * @module lib/utils/format
 * @description 通用格式化与工具函数集合，提供字节大小格式化、相对时间、日期格式化、
 *              文本截断、ID 生成、防抖/节流以及 CSS 类名拼接等功能。
 * @author ClipSync Team
 * @created 2026-04-12
 */

// ── 字节大小格式化 ─────────────────────────────────────────

/**
 * 将字节数转换为人类可读的字符串表示。
 *
 * 支持的单位：B、KB、MB、GB、TB。
 * 当传入负数或非数值时，返回 "0 B"。
 *
 * @param bytes - 字节数
 * @param decimals - 保留小数位数，默认 1
 * @returns 格式化后的字符串，例如 "1.5 MB"
 *
 * @example
 * ```ts
 * formatBytes(0);            // "0 B"
 * formatBytes(1024);         // "1.0 KB"
 * formatBytes(1536000, 2);   // "1.46 MB"
 * formatBytes(1099511627776); // "1.0 TB"
 * ```
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // 超出最大单位时，使用最后一个单位
  const unitIndex = Math.min(i, units.length - 1);
  const value = bytes / Math.pow(k, unitIndex);

  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

// ── 相对时间格式化 ─────────────────────────────────────────

/**
 * 将日期字符串转换为中文相对时间描述。
 *
 * 返回值示例："刚刚"、"5秒前"、"3分钟前"、"2小时前"、"4天前"、"3周前"、"2个月前"。
 * 超过 12 个月时，回退到 "YYYY-MM-DD" 格式。
 *
 * @param dateStr - 可被 Date 构造函数解析的日期字符串
 * @returns 中文相对时间字符串
 *
 * @example
 * ```ts
 * // 假设当前时间为 2026-04-12 12:00:00
 * formatRelativeTime("2026-04-12T12:00:00Z"); // "刚刚"
 * formatRelativeTime("2026-04-12T11:55:00Z"); // "5分钟前"
 * formatRelativeTime("2026-04-10T12:00:00Z"); // "2天前"
 * ```
 */
export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();

  if (Number.isNaN(date)) return dateStr;

  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) return "刚刚";

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}小时前`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}天前`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}周前`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}个月前`;

  // 超过 12 个月，回退到短日期格式
  return formatDate(dateStr, "short");
}

// ── 日期格式化 ─────────────────────────────────────────────

/**
 * 补零辅助函数：将个位数字前面补 "0"。
 *
 * @param n - 数字
 * @returns 补零后的两位字符串
 */
function padZero(n: number): string {
  return n.toString().padStart(2, "0");
}

/**
 * 将日期字符串按指定格式输出。
 *
 * 支持三种格式：
 * - `"short"`：YYYY-MM-DD
 * - `"long"`：YYYY年MM月DD日 HH:mm
 * - `"relative"`：调用 formatRelativeTime 返回中文相对时间
 *
 * @param dateStr - 可被 Date 构造函数解析的日期字符串
 * @param format - 格式类型，默认 "short"
 * @returns 格式化后的日期字符串
 *
 * @example
 * ```ts
 * formatDate("2026-04-12T08:30:00Z", "short");    // "2026-04-12"
 * formatDate("2026-04-12T08:30:00Z", "long");     // "2026年04月12日 08:30"
 * formatDate("2026-04-12T08:30:00Z", "relative"); // "刚刚"
 * ```
 */
export function formatDate(
  dateStr: string,
  format: "short" | "long" | "relative" = "short",
): string {
  if (format === "relative") {
    return formatRelativeTime(dateStr);
  }

  const date = new Date(dateStr);

  if (Number.isNaN(date.getTime())) return dateStr;

  const year = date.getFullYear();
  const month = padZero(date.getMonth() + 1);
  const day = padZero(date.getDate());

  if (format === "short") {
    return `${year}-${month}-${day}`;
  }

  // format === "long"
  const hours = padZero(date.getHours());
  const minutes = padZero(date.getMinutes());
  return `${year}年${month}月${day}日 ${hours}:${minutes}`;
}

// ── 文本截断 ───────────────────────────────────────────────

/**
 * 将文本截断到指定最大长度，超出部分以指定后缀代替。
 *
 * 如果文本长度不超过 maxLength，则原样返回。
 *
 * @param text - 原始文本
 * @param maxLength - 最大字符长度
 * @param suffix - 截断后追加的后缀，默认 "..."
 * @returns 截断后的字符串
 *
 * @example
 * ```ts
 * truncateText("Hello, world!", 5);       // "Hello..."
 * truncateText("Hello, world!", 5, "…");   // "Hello…"
 * truncateText("Hi", 10);                 // "Hi"
 * ```
 */
export function truncateText(
  text: string,
  maxLength: number,
  suffix: string = "...",
): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + suffix;
}

// ── ID 生成 ────────────────────────────────────────────────

/**
 * 生成一个随机的 UUID-like 字符串。
 *
 * 优先使用 `crypto.randomUUID()`，在不支持的环境下回退到
 * 基于 `crypto.getRandomValues()` 的手动拼接实现。
 *
 * @returns 形如 "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx" 的 UUID 字符串
 *
 * @example
 * ```ts
 * const id = generateId(); // "3b12f1df-5232-4e70-ae61-9f6b2c0d7e8a"
 * ```
 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  // 回退方案：手动拼接 UUID v4
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // 设置版本号 (4) 和变体位 (10xx)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ── 防抖 (Debounce) ────────────────────────────────────────

/**
 * 创建一个防抖函数，在最后一次调用后延迟指定时间才执行。
 *
 * @param fn - 需要防抖的函数
 * @param delay - 延迟毫秒数
 * @returns 防抖包装后的函数（与原函数签名一致）
 *
 * @example
 * ```ts
 * const handleSearch = debounce((query: string) => {
 *   fetchResults(query);
 * }, 300);
 * ```
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number,
): T {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  };

  return debounced as T;
}

// ── 节流 (Throttle) ────────────────────────────────────────

/**
 * 创建一个节流函数，在指定时间间隔内最多执行一次。
 *
 * @param fn - 需要节流的函数
 * @param limit - 时间间隔（毫秒）
 * @returns 节流包装后的函数（与原函数签名一致）
 *
 * @example
 * ```ts
 * const handleScroll = throttle(() => {
 *   updatePosition();
 * }, 100);
 * ```
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  limit: number,
): T {
  let lastCall = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const throttled = (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = limit - (now - lastCall);

    if (remaining <= 0) {
      // 已超过间隔，立即执行
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      lastCall = now;
      fn(...args);
    } else if (timer === null) {
      // 等待剩余时间后执行，确保最后一次调用不被丢弃
      timer = setTimeout(() => {
        lastCall = Date.now();
        timer = null;
        fn(...args);
      }, remaining);
    }
  };

  return throttled as T;
}

// ── CSS 类名拼接 ───────────────────────────────────────────

/**
 * 拼接多个 CSS 类名，自动过滤 falsy 值（false、undefined、null、""）。
 *
 * @param classes - 类名列表，可包含字符串、布尔值、undefined 或 null
 * @returns 拼接后的类名字符串，以空格分隔
 *
 * @example
 * ```ts
 * classNames("btn", isActive && "btn-active", undefined, null, "btn-primary");
 * // isActive 为 true  → "btn btn-active btn-primary"
 * // isActive 为 false → "btn btn-primary"
 * ```
 */
export function classNames(
  ...classes: (string | boolean | undefined | null)[]
): string {
  return classes.filter(Boolean).join(" ");
}
