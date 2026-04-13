"use client";

import { useClipboard } from "@/lib/hooks/useClipboard";
import { PasteZone } from "@/components/clipboard/PasteZone";
import { ClipFilter } from "@/components/clipboard/ClipFilter";
import { ClipList } from "@/components/clipboard/ClipList";
import type { ClipType } from "@/types/clip";

/**
 * 剪贴板历史页面。
 *
 * 展示用户所有剪贴板记录，支持粘贴新内容、按类型过滤和各类操作。
 */
export default function ClipsPage() {
  const {
    clips,
    isLoading,
    filters,
    typeCounts,
    handlePaste,
    handleToggleFavorite,
    handleCopy,
    handleDelete,
    handleFilterType,
    resetFilters,
  } = useClipboard();

  const activeType = filters.type ?? "all";

  const handleFilterChange = (type: ClipType | "all") => {
    if (type === "all") {
      resetFilters();
    } else {
      handleFilterType(type);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">剪贴板历史</h1>
        <p className="text-muted-foreground">
          查看和管理你的所有剪贴板记录
        </p>
      </div>

      {/* Paste Zone */}
      <PasteZone onPaste={handlePaste} />

      {/* Filter Bar */}
      <ClipFilter
        activeType={activeType}
        counts={typeCounts}
        onChange={handleFilterChange}
      />

      {/* Clip List */}
      <ClipList
        clips={clips}
        isLoading={isLoading}
        onToggleFavorite={handleToggleFavorite}
        onCopy={handleCopy}
        onDelete={handleDelete}
      />
    </div>
  );
}
