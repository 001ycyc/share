/**
 * @module lib/utils/content-detector
 * @description 内容类型检测工具函数，用于判断剪贴板内容的类型（文本、图片、视频、音乐、链接、文件）。
 * @author ClipSync Team
 * @created 2026-04-12
 */

import type { ClipType } from "@/types/clip";

// ── MIME 类型集合 ─────────────────────────────────────────

/** 常见图片 MIME 类型 */
export const IMAGE_MIME_TYPES: Set<string> = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
  "image/tiff",
  "image/avif",
  "image/ico",
]);

/** 常见视频 MIME 类型 */
export const VIDEO_MIME_TYPES: Set<string> = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/mpeg",
]);

/** 常见音频 MIME 类型 */
export const AUDIO_MIME_TYPES: Set<string> = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/flac",
  "audio/aac",
  "audio/x-m4a",
  "audio/webm",
]);

// ── 检测函数 ─────────────────────────────────────────────

/**
 * 根据 MIME 类型判断内容类型。
 *
 * @param mimeType - 文件的 MIME 类型字符串
 * @returns 对应的 ClipType（"image" | "video" | "music" | "file"）
 *
 * @example
 * ```ts
 * detectTypeFromMime("image/png"); // "image"
 * detectTypeFromMime("video/mp4"); // "video"
 * detectTypeFromMime("application/pdf"); // "file"
 * ```
 */
export function detectTypeFromMime(mimeType: string): "image" | "video" | "music" | "file" {
  if (IMAGE_MIME_TYPES.has(mimeType)) return "image";
  if (VIDEO_MIME_TYPES.has(mimeType)) return "video";
  if (AUDIO_MIME_TYPES.has(mimeType)) return "music";
  return "file";
}

/**
 * 判断给定文本是否为合法 URL。
 *
 * @param text - 待检测的文本字符串
 * @returns 如果文本能被解析为合法 URL 则返回 true，否则返回 false
 *
 * @example
 * ```ts
 * isUrl("https://example.com"); // true
 * isUrl("not a url"); // false
 * ```
 */
export function isUrl(text: string): boolean {
  try {
    new URL(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * 综合检测剪贴板内容的类型。
 *
 * 优先级：文件 > URL > 默认文本。
 * - 如果提供了文件列表，则根据第一个文件的 MIME 类型判断。
 * - 如果没有文件但文本是合法 URL，则返回 "link"。
 * - 其他情况默认返回 "text"。
 *
 * @param files - 文件列表（可为 null）
 * @param text - 文本内容
 * @returns 检测到的 ClipType
 *
 * @example
 * ```ts
 * detectContentType([pngFile], ""); // "image"
 * detectContentType(null, "https://example.com"); // "link"
 * detectContentType(null, "Hello world"); // "text"
 * ```
 */
export function detectContentType(
  files: File[] | null,
  text: string,
): ClipType {
  if (files && files.length > 0) {
    return detectTypeFromMime(files[0].type);
  }
  if (text && isUrl(text.trim())) {
    return "link";
  }
  return "text";
}

// ── 样式映射 ─────────────────────────────────────────────

/**
 * 每种 ClipType 对应的 Tailwind 颜色类。
 *
 * - `bg`：Badge 背景色
 * - `text`：Badge 文字颜色
 *
 * @example
 * ```ts
 * typeColors.image.bg   // "bg-blue-100"
 * typeColors.image.text  // "text-blue-700"
 * ```
 */
export const typeColors: Record<ClipType, { bg: string; text: string }> = {
  text: { bg: "bg-gray-100", text: "text-gray-700" },
  image: { bg: "bg-blue-100", text: "text-blue-700" },
  link: { bg: "bg-green-100", text: "text-green-700" },
  file: { bg: "bg-orange-100", text: "text-orange-700" },
  video: { bg: "bg-purple-100", text: "text-purple-700" },
  music: { bg: "bg-pink-100", text: "text-pink-700" },
};

/**
 * 每种 ClipType 对应的中文标签。
 *
 * @example
 * ```ts
 * typeLabels.text;  // "文本"
 * typeLabels.image; // "图片"
 * ```
 */
export const typeLabels: Record<ClipType, string> = {
  text: "文本",
  image: "图片",
  link: "链接",
  file: "文件",
  video: "视频",
  music: "音乐",
};
