"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { handleError } from "@/lib/errors/handler";
import { useClipboard } from "@/lib/hooks/useClipboard";
import { PasteZone } from "@/components/clipboard/PasteZone";
import { ClipFilter } from "@/components/clipboard/ClipFilter";
import { ClipList } from "@/components/clipboard/ClipList";
import { ClipEditor } from "@/components/clipboard/ClipEditor";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClipType, Clip } from "@/types/clip";

/**
 * 剪贴板历史页面。
 *
 * 展示用户所有剪贴板记录，支持粘贴新内容、按类型过滤和各类操作。
 */
export default function ClipsPage() {
  const {
    clips,
    totalCount,
    isLoading,
    filters,
    typeCounts,
    loadClips,
    handlePaste,
    handleToggleFavorite,
    handleCopy,
    handleDelete,
    handleBatchDelete,
    handleBatchFavorite,
    handleFilterType,
    resetFilters,
    setFilter,
  } = useClipboard();

  const [editingClip, setEditingClip] = useState<Clip | null>(null);

  // Ctrl+N 快捷键：打开文件选择
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.multiple = true;
        fileInput.accept = "*/*";
        fileInput.onchange = (ev) => {
          const files = (ev.target as HTMLInputElement).files;
          if (files && files.length > 0) {
            handlePaste("", Array.from(files));
          }
        };
        fileInput.click();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handlePaste]);

  const activeType = filters.type ?? "all";

  // 合并类型计数，"all" 使用 totalCount
  const filterCounts = { ...typeCounts, all: totalCount };

  const handleFilterChange = (type: ClipType | "all") => {
    if (type === "all") {
      resetFilters();
    } else {
      handleFilterType(type);
    }
  };

  const handleEdit = (clip: Clip) => {
    setEditingClip(clip);
  };

  const handleSaveEdit = async (content: string) => {
    if (!editingClip) return;
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("clips")
        .update({
          content,
          contentPreview: content.slice(0, 200),
          title: content.slice(0, 30).trim() || "无标题文本",
        })
        .eq("id", editingClip.id)
        .eq("userId", user.id);
      if (error) throw error;
      setEditingClip(null);
      loadClips();
      toast.success("已保存");
    } catch (error) {
      const result = handleError(error);
      toast.error(result.userMessage);
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

      {/* Clip Editor */}
      {editingClip && (
        <div className="max-w-2xl">
          <ClipEditor
            initialContent={editingClip.content}
            onSave={handleSaveEdit}
            onCancel={() => setEditingClip(null)}
          />
        </div>
      )}

      {/* Filter Bar */}
      <ClipFilter
        activeType={activeType}
        counts={filterCounts}
        onChange={handleFilterChange}
      />

      {/* 高级筛选 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">时间范围</Label>
          <Input
            type="date"
            className="w-40 h-8 text-sm"
            onChange={(e) => setFilter({ dateFrom: e.target.value || undefined })}
          />
          <span className="text-muted-foreground">至</span>
          <Input
            type="date"
            className="w-40 h-8 text-sm"
            onChange={(e) => setFilter({ dateTo: e.target.value || undefined })}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">来源设备</Label>
          <Select
            onValueChange={(value: string | null) =>
              setFilter({ sourceDevice: !value || value === "all" ? undefined : value })
            }
          >
            <SelectTrigger className="w-32 h-8 text-sm">
              <SelectValue placeholder="全部设备" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部设备</SelectItem>
              <SelectItem value="Web">Web</SelectItem>
              <SelectItem value="iOS">iOS</SelectItem>
              <SelectItem value="Android">Android</SelectItem>
              <SelectItem value="Windows">Windows</SelectItem>
              <SelectItem value="macOS">macOS</SelectItem>
              <SelectItem value="Linux">Linux</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(filters.dateFrom || filters.dateTo || filters.sourceDevice) && (
          <Button variant="ghost" size="sm" onClick={() => resetFilters()}>
            清除筛选
          </Button>
        )}
      </div>

      {/* Clip List */}
      <ClipList
        clips={clips}
        isLoading={isLoading}
        onToggleFavorite={handleToggleFavorite}
        onCopy={handleCopy}
        onDelete={handleDelete}
        onBatchDelete={handleBatchDelete}
        onBatchFavorite={handleBatchFavorite}
        onEdit={handleEdit}
      />
    </div>
  );
}
