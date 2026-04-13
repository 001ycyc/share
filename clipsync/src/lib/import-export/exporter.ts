/**
 * @module lib/import-export/exporter
 * @description 剪贴板数据导出模块。
 *              提供 JSON 和 CSV 两种格式的导出功能，支持将剪贴板条目序列化并触发浏览器下载。
 *              导出时会自动剥离内部字段（id、userId、isDeleted），确保导出数据的安全性。
 * @author ClipSync Team
 * @created 2026-04-12
 */

import type { Clip } from "@/types/clip";

/**
 * JSON 导出数据结构接口。
 * 描述导出 JSON 文件的顶层结构，包含版本信息和剪贴板数据。
 *
 * @property version - 导出格式版本号
 * @property exportedAt - 导出时间（ISO 8601 格式）
 * @property clipCount - 导出的剪贴板条目数量
 * @property clips - 剪贴板条目数组（已剥离内部字段）
 */
interface ExportJSON {
  version: string;
  exportedAt: string;
  clipCount: number;
  clips: Omit<Clip, "id" | "userId" | "isDeleted">[];
}

/**
 * 将剪贴板条目导出为 JSON 文件。
 *
 * 生成包含版本信息、导出时间和剪贴板数据的 JSON 文件，并自动触发浏览器下载。
 * 导出时会剥离每条剪贴板记录的 id、userId 和 isDeleted 字段。
 *
 * @param clips - 要导出的剪贴板条目数组
 * @param filename - 可选的自定义文件名（不含扩展名），默认为 "clipsync-export"
 *
 * @example
 * ```typescript
 * import { exportAsJSON } from "@/lib/import-export/exporter";
 * import { useClipStore } from "@/stores/clip.store";
 *
 * const { clips } = useClipStore.getState();
 * exportAsJSON(clips);
 * // 下载 clipsync-export-2026-04-12T10-30-00.json
 * ```
 */
export function exportAsJSON(clips: Clip[], filename?: string): void {
  const sanitizedClips = clips.map(({ id, userId, isDeleted, ...rest }) => rest);

  const exportData: ExportJSON = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    clipCount: sanitizedClips.length,
    clips: sanitizedClips,
  };

  const json = JSON.stringify(exportData, null, 2);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const finalFilename = filename
    ? `${filename}.json`
    : `clipsync-export-${timestamp}.json`;

  downloadFile(json, finalFilename, "application/json");
}

/**
 * 将剪贴板条目导出为 CSV 文件。
 *
 * 仅导出文本类型（text）和链接类型（link）的剪贴板条目。
 * CSV 文件包含表头行：type,title,content,sourceDevice,createdAt,isFavorite。
 *
 * @param clips - 要导出的剪贴板条目数组
 * @param filename - 可选的自定义文件名（不含扩展名），默认为 "clipsync-export"
 *
 * @example
 * ```typescript
 * import { exportAsCSV } from "@/lib/import-export/exporter";
 * import { useClipStore } from "@/stores/clip.store";
 *
 * const { clips } = useClipStore.getState();
 * exportAsCSV(clips);
 * // 下载 clipsync-export-2026-04-12T10-30-00.csv
 * ```
 */
export function exportAsCSV(clips: Clip[], filename?: string): void {
  const exportableClips = clips.filter(
    (clip) => clip.type === "text" || clip.type === "link"
  );

  const header = "type,title,content,sourceDevice,createdAt,isFavorite";
  const rows = exportableClips.map((clip) => {
    return [
      clip.type,
      escapeCSV(clip.title),
      escapeCSV(clip.content),
      escapeCSV(clip.sourceDevice),
      clip.createdAt,
      clip.isFavorite ? "true" : "false",
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const finalFilename = filename
    ? `${filename}.csv`
    : `clipsync-export-${timestamp}.csv`;

  // 添加 BOM 以确保 Excel 正确识别 UTF-8 编码
  const bom = "\uFEFF";
  downloadFile(bom + csv, finalFilename, "text/csv;charset=utf-8");
}

/**
 * 通过 Blob 和 URL.createObjectURL 触发浏览器文件下载。
 *
 * @param content - 文件内容字符串
 * @param filename - 下载的文件名
 * @param mimeType - 文件的 MIME 类型
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  // 清理临时 DOM 元素和 ObjectURL
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 转义 CSV 字段值。
 *
 * 如果字段值包含逗号、双引号或换行符，则用双引号包裹并将内部双引号转义为两个双引号。
 *
 * @param str - 需要转义的字符串
 * @returns 转义后的 CSV 安全字符串
 */
function escapeCSV(str: string): string {
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
