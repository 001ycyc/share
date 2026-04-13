/**
 * @module lib/storage/compressor
 * @description 文件压缩工具。
 *              提供图片压缩（转换为 WebP 格式）、压缩目标格式判断和压缩后大小估算功能。
 *              图片压缩使用浏览器 Canvas API 实现，支持优雅降级。
 * @author ClipSync Team
 * @created 2026-04-12
 */

/**
 * 压缩目标格式类型。
 *
 * - "webp": 转换为 WebP 格式（适用于图片）
 * - "mp4": 转换为 MP4 格式（适用于视频）
 * - "original": 保持原始格式（不支持的类型）
 */
type CompressionTarget = "webp" | "mp4" | "original";

/**
 * 支持压缩的图片 MIME 类型集合。
 */
const IMAGE_MIME_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/bmp",
  "image/tiff",
  "image/webp",
  "image/svg+xml",
]);

/**
 * 支持压缩的视频 MIME 类型集合。
 */
const VIDEO_MIME_TYPES: ReadonlySet<string> = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
]);

/**
 * 压缩图片文件。
 *
 * 使用浏览器 Canvas API 将图片转换为 WebP 格式，以减小文件大小。
 * 转换质量设置为 0.8，在保持视觉质量的同时实现较好的压缩率。
 * 如果压缩过程中发生错误（例如浏览器不支持 Canvas API 或文件格式不兼容），
 * 将返回原始文件作为降级处理。
 *
 * @param file - 待压缩的图片文件对象
 * @returns 压缩后的 File 对象（WebP 格式），如果压缩失败则返回原始文件
 *
 * @example
 * ```ts
 * const file = new File(["..."], "photo.jpg", { type: "image/jpeg" });
 * const compressed = await compressImage(file);
 * // compressed.type === "image/webp"
 * // compressed.size < file.size
 * ```
 */
export async function compressImage(file: File): Promise<File> {
  // 非图片类型直接返回原文件
  if (!IMAGE_MIME_TYPES.has(file.type)) {
    return file;
  }

  try {
    // 创建图片元素并加载文件
    const imageBitmap = await createImageBitmap(file);

    // 创建 Canvas 进行格式转换
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return file;
    }

    // 绘制图片到 Canvas
    ctx.drawImage(imageBitmap, 0, 0);

    // 转换为 WebP Blob，质量 0.8
    const blob = await canvas.convertToBlob({
      type: "image/webp",
      quality: 0.8,
    });

    // 如果压缩后反而更大，返回原文件
    if (blob.size >= file.size) {
      return file;
    }

    // 生成新文件名
    const originalName = file.name.replace(/\.[^.]+$/, "");
    const compressedFile = new File([blob], `${originalName}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });

    return compressedFile;
  } catch {
    // 压缩失败时返回原始文件
    return file;
  }
}

/**
 * 根据输入文件的 MIME 类型获取压缩目标格式。
 *
 * 判断逻辑：
 * - 图片类型（image/*）: 返回 "webp"
 * - 视频类型（video/*）: 返回 "mp4"
 * - 其他类型: 返回 "original"（不进行压缩）
 *
 * @param mimeType - 输入文件的 MIME 类型字符串
 * @returns 压缩目标格式
 *
 * @example
 * ```ts
 * getCompressionTarget("image/png");  // "webp"
 * getCompressionTarget("video/webm"); // "mp4"
 * getCompressionTarget("text/plain"); // "original"
 * ```
 */
export function getCompressionTarget(mimeType: string): CompressionTarget {
  if (IMAGE_MIME_TYPES.has(mimeType)) {
    return "webp";
  }

  if (VIDEO_MIME_TYPES.has(mimeType)) {
    return "mp4";
  }

  return "original";
}

/**
 * 估算文件压缩后的大小。
 *
 * 基于文件类型应用不同的压缩率估算：
 * - 图片类型: 压缩后大小约为原始大小的 50%（即减少 50%）
 * - 视频类型: 压缩后大小约为原始大小的 70%（即减少 30%）
 * - 其他类型: 不压缩，返回原始大小
 *
 * 注意：此估算值仅供参考，实际压缩结果可能因文件内容和压缩参数而异。
 *
 * @param fileSize - 原始文件大小（字节）
 * @param mimeType - 文件的 MIME 类型字符串
 * @returns 估算的压缩后文件大小（字节）
 *
 * @example
 * ```ts
 * estimateCompressedSize(1048576, "image/jpeg");  // 524288 (50%)
 * estimateCompressedSize(10485760, "video/mp4");  // 7340032 (70%)
 * estimateCompressedSize(1024, "text/plain");     // 1024 (original)
 * ```
 */
export function estimateCompressedSize(
  fileSize: number,
  mimeType: string
): number {
  const target = getCompressionTarget(mimeType);

  switch (target) {
    case "webp":
      // 图片压缩：减少约 50%
      return Math.floor(fileSize * 0.5);
    case "mp4":
      // 视频压缩：减少约 30%
      return Math.floor(fileSize * 0.7);
    case "original":
    default:
      // 不压缩
      return fileSize;
  }
}
