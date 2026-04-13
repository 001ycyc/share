"use client";

/**
 * @module components/clipboard/ClipFilter
 * @description 剪贴板类型筛选栏组件，支持按内容类型过滤条目。
 * @author ClipSync Team
 * @created 2026-04-12
 */

import type { ClipType } from "@/types/clip";
import { typeLabels } from "@/lib/utils/content-detector";

// ── Props ────────────────────────────────────────────────

interface ClipFilterProps {
  /** 当前激活的筛选类型，"all" 表示不筛选 */
  activeType: ClipType | "all";
  /** 各类型对应的条目数量 */
  counts?: Record<string, number>;
  /** 类型变更回调 */
  onChange: (type: ClipType | "all") => void;
}

/** 所有可选的筛选类型 */
const FILTER_TYPES: Array<{ key: ClipType | "all"; label: string }> = [
  { key: "all", label: "全部" },
  { key: "text", label: typeLabels.text },
  { key: "image", label: typeLabels.image },
  { key: "link", label: typeLabels.link },
  { key: "file", label: typeLabels.file },
  { key: "video", label: typeLabels.video },
  { key: "music", label: typeLabels.music },
];

// ── 组件 ─────────────────────────────────────────────────

/**
 * 类型筛选栏。
 *
 * 水平排列一组筛选按钮，每个按钮显示类型标签和对应数量。
 * - 激活状态：`bg-brand-600 text-white`
 * - 未激活状态：`bg-white border text-gray-600`
 */
export function ClipFilter({ activeType, counts, onChange }: ClipFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {FILTER_TYPES.map(({ key, label }) => {
        const isActive = activeType === key;
        const count = counts?.[key] ?? 0;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={
              isActive
                ? "inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors"
                : "inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            }
          >
            {label}
            <span
              className={
                isActive
                  ? "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/20 px-1 text-xs"
                  : "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-100 px-1 text-xs text-gray-500"
              }
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
