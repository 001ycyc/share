/**
 * @module lib/import-export/importer
 * @description 剪贴板数据导入模块。
 *              提供 JSON 和 CSV 两种格式的文件解析功能，支持导入预览和重复内容检测。
 *              解析结果通过 ImportPreview 接口返回，包含去重信息和条目预览列表。
 * @author ClipSync Team
 * @created 2026-04-12
 */

import type { Clip } from "@/types/clip";
import { AppError } from "@/lib/errors/app-error";

/**
 * 导入预览结果接口。
 * 描述文件解析后的预览信息，包括总条目数、重复条目数和条目详情列表。
 *
 * @property totalItems - 文件中的总条目数
 * @property duplicates - 与现有剪贴板内容重复的条目数
 * @property items - 导入条目详情数组
 */
export interface ImportPreview {
  totalItems: number;
  duplicates: number;
  items: ImportItem[];
}

/**
 * 单条导入条目接口。
 * 描述从导入文件中解析出的单条记录信息。
 *
 * @property type - 剪贴板条目类型（如 text、link 等）
 * @property title - 条目标题
 * @property content - 条目内容
 * @property sourceDevice - 来源设备标识
 * @property isDuplicate - 是否与现有剪贴板内容重复
 */
export interface ImportItem {
  type: string;
  title: string;
  content: string;
  sourceDevice: string;
  isDuplicate: boolean;
}

/**
 * 解析 JSON 格式的导入文件。
 *
 * 读取并解析 JSON 文件，验证文件格式和内容有效性，检测与现有剪贴板条目的重复内容。
 *
 * 预期 JSON 结构：
 * ```json
 * {
 *   "version": "1.0",
 *   "exportedAt": "...",
 *   "clipCount": 10,
 *   "clips": [...]
 * }
 * ```
 *
 * @param file - 用户选择的 JSON 文件
 * @param existingClips - 当前已有的剪贴板条目数组，用于重复检测
 * @returns 解析后的导入预览结果
 * @throws {AppError} IE_001 - 当文件无法解析为有效 JSON 时
 * @throws {AppError} IE_002 - 当 JSON 中缺少 clips 数组或内容无效时
 *
 * @example
 * ```typescript
 * import { parseJSONImport } from "@/lib/import-export/importer";
 * import { useClipStore } from "@/stores/clip.store";
 *
 * const file = event.target.files[0];
 * const { clips } = useClipStore.getState();
 * const preview = await parseJSONImport(file, clips);
 * console.log(preview.totalItems, preview.duplicates);
 * ```
 */
export async function parseJSONImport(
  file: File,
  existingClips: Clip[]
): Promise<ImportPreview> {
  const text = await file.text();

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new AppError("IE_001", {
      message: `无法解析 JSON 文件: ${file.name}`,
    });
  }

  if (
    typeof data !== "object" ||
    data === null ||
    !("clips" in data) ||
    !Array.isArray((data as Record<string, unknown>).clips)
  ) {
    throw new AppError("IE_002", {
      message: `JSON 文件缺少有效的 clips 数组: ${file.name}`,
    });
  }

  const clips = (data as Record<string, unknown>).clips as Record<string, unknown>[];
  const existingContents = new Set(
    existingClips.map((clip) => clip.content)
  );

  const items: ImportItem[] = clips.map((clip) => {
    const content = String(clip.content ?? "");
    const isDuplicate = existingContents.has(content);

    return {
      type: String(clip.type ?? "text"),
      title: String(clip.title ?? ""),
      content,
      sourceDevice: String(clip.sourceDevice ?? ""),
      isDuplicate,
    };
  });

  const duplicates = items.filter((item) => item.isDuplicate).length;

  return {
    totalItems: items.length,
    duplicates,
    items,
  };
}

/**
 * 解析 CSV 格式的导入文件。
 *
 * 读取并解析 CSV 文件，跳过表头行，逐行解析剪贴板条目，检测与现有条目的重复内容。
 *
 * 预期 CSV 表头：type,title,content,sourceDevice,createdAt,isFavorite
 *
 * @param file - 用户选择的 CSV 文件
 * @param existingClips - 当前已有的剪贴板条目数组，用于重复检测
 * @returns 解析后的导入预览结果
 * @throws {AppError} IE_002 - 当文件内容为空或格式无效时
 *
 * @example
 * ```typescript
 * import { parseCSVImport } from "@/lib/import-export/importer";
 * import { useClipStore } from "@/stores/clip.store";
 *
 * const file = event.target.files[0];
 * const { clips } = useClipStore.getState();
 * const preview = await parseCSVImport(file, clips);
 * console.log(preview.totalItems, preview.duplicates);
 * ```
 */
export async function parseCSVImport(
  file: File,
  existingClips: Clip[]
): Promise<ImportPreview> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

  if (lines.length < 2) {
    throw new AppError("IE_002", {
      message: `CSV 文件内容为空或缺少数据行: ${file.name}`,
    });
  }

  // 跳过表头行
  const dataLines = lines.slice(1);

  const existingContents = new Set(
    existingClips.map((clip) => clip.content)
  );

  const items: ImportItem[] = dataLines.map((line) => {
    const fields = parseCSVLine(line);
    const type = fields[0] ?? "text";
    const title = fields[1] ?? "";
    const content = fields[2] ?? "";
    const sourceDevice = fields[3] ?? "";
    const isDuplicate = existingContents.has(content);

    return {
      type,
      title,
      content,
      sourceDevice,
      isDuplicate,
    };
  });

  const duplicates = items.filter((item) => item.isDuplicate).length;

  return {
    totalItems: items.length,
    duplicates,
    items,
  };
}

/**
 * 解析单行 CSV 字符串。
 *
 * 正确处理带双引号包裹的字段（包括字段内包含逗号和转义双引号的情况）。
 *
 * @param line - CSV 格式的单行字符串
 * @returns 解析后的字段值数组
 *
 * @example
 * ```typescript
 * parseCSVLine('text,"Hello, World",MyDevice,2026-04-12,true');
 * // => ["text", "Hello, World", "MyDevice", "2026-04-12", "true"]
 *
 * parseCSVLine('link,"Title with ""quotes""","https://example.com",Device,false');
 * // => ["link", 'Title with "quotes"', "https://example.com", "Device", "false"]
 * ```
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // 转义双引号：两个连续双引号表示一个双引号
        current += '"';
        i++;
      } else if (char === '"') {
        // 结束引号包裹
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }

  // 添加最后一个字段
  fields.push(current);

  return fields;
}
