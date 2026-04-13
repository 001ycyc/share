"use client";

/**
 * @module components/clipboard/ClipList
 * @description 剪贴板条目列表组件，根据 UI store 的 viewMode 切换网格/列表布局。
 * @author ClipSync Team
 * @created 2026-04-12
 */

import { useState } from "react";
import { ClipboardList, CheckSquare, XSquare, Trash2, Star, Copy, Trash } from "lucide-react";
import type { Clip } from "@/types/clip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUIStore } from "@/stores/ui.store";
import { useClipStore } from "@/stores/clip.store";
import { ClipCard } from "./ClipCard";

// ── Props ────────────────────────────────────────────────

interface ClipListProps {
  /** 剪贴板条目数组 */
  clips: Clip[];
  /** 是否处于加载状态 */
  isLoading?: boolean;
  /** 切换收藏状态回调 */
  onToggleFavorite?: (id: string) => void;
  /** 复制内容回调 */
  onCopy?: (clip: Clip) => void;
  /** 删除条目回调 */
  onDelete?: (id: string) => void;
  /** 编辑条目回调 */
  onEdit?: (clip: Clip) => void;
  /** 批量删除回调 */
  onBatchDelete?: (ids: string[]) => void;
  /** 批量收藏回调 */
  onBatchFavorite?: (ids: string[]) => void;
}

// ── 加载骨架屏 ───────────────────────────────────────────

/** 网格模式的骨架屏占位 */
function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
          <Skeleton className="h-40 w-full rounded-none" />
          <div className="flex flex-col gap-2 p-3">
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="mt-auto flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** 列表模式的骨架屏占位 */
function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl bg-card ring-1 ring-foreground/10 py-2 px-4">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="flex flex-1 items-center gap-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
          <div className="flex gap-1">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-6 w-6 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 组件 ─────────────────────────────────────────────────

/**
 * 剪贴板条目列表。
 *
 * 根据 `useUIStore` 中的 `viewMode` 自动切换网格/列表布局。
 * - 加载中时显示 8 个骨架屏占位。
 * - 无数据时显示空状态提示。
 */
export function ClipList({
  clips,
  isLoading = false,
  onToggleFavorite,
  onCopy,
  onDelete,
  onEdit,
  onBatchDelete,
  onBatchFavorite,
}: ClipListProps) {
  const viewMode = useUIStore((s) => s.viewMode);
  const selectedIds = useClipStore((s) => s.selectedIds);
  const toggleSelect = useClipStore((s) => s.toggleSelect);
  const selectAll = useClipStore((s) => s.selectAll);
  const clearSelection = useClipStore((s) => s.clearSelection);
  const [selectMode, setSelectMode] = useState(false);

  // 加载状态
  if (isLoading) {
    return viewMode === "grid" ? <GridSkeleton /> : <ListSkeleton />;
  }

  // 批量操作栏
  const hasSelection = selectedIds.size > 0;
  const allSelected = clips.length > 0 && clips.every((c) => selectedIds.has(c.id));
  const clipIds = clips.map((c) => c.id);
  if (selectMode && clips.length > 0) {
    return (
      <div className="space-y-4">
        {/* 操作栏 */}
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
          <span className="text-sm font-medium">已选择 {selectedIds.size} 项</span>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => selectAll(clipIds)}>
            {allSelected ? "取消全选" : "全选"}
          </Button>
          {hasSelection && onBatchFavorite && (
            <Button variant="outline" size="sm" onClick={() => onBatchFavorite(Array.from(selectedIds))}>
              <Star className="mr-1 h-3.5 w-3.5" />批量收藏
            </Button>
          )}
          {hasSelection && onBatchDelete && (
            <Button variant="outline" size="sm" onClick={() => onBatchDelete(Array.from(selectedIds))}>
              <Trash2 className="mr-1 h-3.5 w-3.5" />批量删除
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => { setSelectMode(false); clearSelection(); }}>
            取消
          </Button>
        </div>
        {/* 列表 */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {clips.map((clip) => (
              <ClipCard key={clip.id} clip={clip} viewMode="grid" selectMode selected={selectedIds.has(clip.id)} onToggleSelect={toggleSelect} onToggleFavorite={onToggleFavorite} onCopy={onCopy} onDelete={onDelete} onEdit={onEdit} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {clips.map((clip) => (
              <ClipCard key={clip.id} clip={clip} viewMode="list" selectMode selected={selectedIds.has(clip.id)} onToggleSelect={toggleSelect} onToggleFavorite={onToggleFavorite} onCopy={onCopy} onDelete={onDelete} onEdit={onEdit} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // 空状态
  if (clips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
        <ClipboardList className="h-12 w-12" />
        <p className="text-sm">暂无剪贴板记录</p>
      </div>
    );
  }

  // 网格布局
  if (viewMode === "grid") {
    return (
      <div className="space-y-4">
        {/* 工具栏 */}
        {clips.length > 0 && (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setSelectMode(true)}>
              <CheckSquare className="mr-1 h-3.5 w-3.5" />多选
            </Button>
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {clips.map((clip) => (
            <ClipCard
              key={clip.id}
              clip={clip}
              viewMode="grid"
              selectMode={selectMode}
              selected={selectedIds.has(clip.id)}
              onToggleSelect={toggleSelect}
              onToggleFavorite={onToggleFavorite}
              onCopy={onCopy}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </div>
      </div>
    );
  }

  // 列表布局
  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      {clips.length > 0 && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setSelectMode(true)}>
            <CheckSquare className="mr-1 h-3.5 w-3.5" />多选
          </Button>
        </div>
      )}
      <div className="flex flex-col gap-2">
        {clips.map((clip) => (
          <ClipCard
            key={clip.id}
            clip={clip}
            viewMode="list"
            selectMode={selectMode}
            selected={selectedIds.has(clip.id)}
            onToggleSelect={toggleSelect}
            onToggleFavorite={onToggleFavorite}
            onCopy={onCopy}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
}
