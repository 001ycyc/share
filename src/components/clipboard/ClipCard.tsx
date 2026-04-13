"use client";

/**
 * @module components/clipboard/ClipCard
 * @description 剪贴板条目卡片组件，支持网格和列表两种视图模式。
 * @author ClipSync Team
 * @created 2026-04-12
 */

import { Star, Copy, MoreHorizontal, Type, Image, Link, File, Video, Music, Pencil, Trash } from "lucide-react";
import type { ClipType } from "@/types/clip";
import type { Clip } from "@/types/clip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { typeColors, typeLabels } from "@/lib/utils/content-detector";

// ── 类型图标映射 ─────────────────────────────────────────

/** 每种 ClipType 对应的 lucide 图标组件 */
const typeIcons: Record<ClipType, React.ComponentType<{ className?: string }>> = {
  text: Type,
  image: Image,
  link: Link,
  file: File,
  video: Video,
  music: Music,
};

// ── Props ────────────────────────────────────────────────

interface ClipCardProps {
  /** 剪贴板条目数据 */
  clip: Clip;
  /** 切换收藏状态回调 */
  onToggleFavorite?: (id: string) => void;
  /** 复制内容回调 */
  onCopy?: (clip: Clip) => void;
  /** 删除条目回调 */
  onDelete?: (id: string) => void;
  /** 编辑条目回调 */
  onEdit?: (clip: Clip) => void;
  /** 视图模式 */
  viewMode?: "grid" | "list";
  /** 是否处于选择模式 */
  selectMode?: boolean;
  /** 当前是否被选中 */
  selected?: boolean;
  /** 切换选中状态回调 */
  onToggleSelect?: (id: string) => void;
}

// ── 工具函数 ─────────────────────────────────────────────

/** 格式化时间戳为相对时间或本地化字符串 */
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)} 天前`;

  return date.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── 组件 ─────────────────────────────────────────────────

/**
 * 剪贴板条目卡片。
 *
 * - **网格模式**：垂直卡片，包含可选的图片/视频预览、类型 Badge、
 *   内容预览（最多两行）、时间戳、来源设备，以及鼠标悬停时显示的操作按钮。
 * - **列表模式**：水平卡片，紧凑排列图标、标题、时间戳、Badge 和操作按钮。
 */
export function ClipCard({
  clip,
  onToggleFavorite,
  onCopy,
  onDelete,
  onEdit,
  viewMode = "grid",
  selectMode,
  selected,
  onToggleSelect,
}: ClipCardProps) {
  const Icon = typeIcons[clip.type];
  const colors = typeColors[clip.type];
  const label = typeLabels[clip.type];

  const showPreview =
    (clip.type === "image" || clip.type === "video") && clip.fileUrl;

  // ── 列表模式 ─────────────────────────────────────────
  if (viewMode === "list") {
    return (
      <Card className="flex flex-row items-center gap-3 py-2 px-4 transition-colors hover:bg-muted/50">
        {/* 多选 Checkbox */}
        {selectMode && (
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect?.(clip.id)}
            className="shrink-0"
          />
        )}
        {/* 类型图标 */}
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colors.bg}`}>
          <Icon className={`h-4 w-4 ${colors.text}`} />
        </div>

        {/* 内容区 */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="truncate text-sm font-medium">{clip.title || clip.contentPreview}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{formatTime(clip.createdAt)}</span>
          <Badge variant="secondary" className={`shrink-0 text-xs ${colors.bg} ${colors.text}`}>
            {label}
          </Badge>
        </div>

        {/* 操作按钮 */}
        <div className="flex shrink-0 items-center gap-1">
          {onEdit && clip.type === "text" && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onEdit(clip)}
              aria-label="编辑"
            >
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
          {onToggleFavorite && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onToggleFavorite(clip.id)}
              aria-label={clip.isFavorite ? "取消收藏" : "收藏"}
            >
              <Star className={`h-4 w-4 ${clip.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
            </Button>
          )}
          {onCopy && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onCopy(clip)}
              aria-label="复制"
            >
              <Copy className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onDelete(clip.id)}
              aria-label="删除"
            >
              <Trash className="h-4 w-4 text-destructive/60 hover:text-destructive" />
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // ── 网格模式 ─────────────────────────────────────────
  return (
    <Card className="group relative flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      {/* 多选 Checkbox */}
      {selectMode && (
        <div className="absolute left-2 top-2 z-10">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect?.(clip.id)}
            className="bg-white/80 border-gray-300"
          />
        </div>
      )}
      {/* 图片/视频预览 */}
      {showPreview && (
        <div className="relative h-40 w-full overflow-hidden bg-muted">
          {clip.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={clip.fileUrl!}
              alt={clip.title || "图片预览"}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <video
              src={clip.fileUrl!}
              className="h-full w-full object-cover"
              muted
              preload="metadata"
            />
          )}
          {/* 悬停操作按钮 */}
          <div className="absolute inset-0 flex items-end justify-end gap-1 bg-gradient-to-t from-black/40 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
            {onEdit && clip.type === "text" && (
              <Button variant="ghost" size="icon-xs" className="bg-white/80 hover:bg-white" onClick={() => onEdit(clip)} aria-label="编辑">
                <Pencil className="h-4 w-4 text-gray-600" />
              </Button>
            )}
            {onToggleFavorite && (
              <Button
                variant="ghost"
                size="icon-xs"
                className="bg-white/80 hover:bg-white"
                onClick={() => onToggleFavorite(clip.id)}
                aria-label={clip.isFavorite ? "取消收藏" : "收藏"}
              >
                <Star className={`h-4 w-4 ${clip.isFavorite ? "fill-yellow-400 text-yellow-500" : "text-gray-600"}`} />
              </Button>
            )}
            {onCopy && (
              <Button
                variant="ghost"
                size="icon-xs"
                className="bg-white/80 hover:bg-white"
                onClick={() => onCopy(clip)}
                aria-label="复制"
              >
                <Copy className="h-4 w-4 text-gray-600" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon-xs"
                className="bg-white/80 hover:bg-white"
                onClick={() => onDelete(clip.id)}
                aria-label="删除"
              >
                <Trash className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
        </div>
      )}

      <CardContent className="flex flex-1 flex-col gap-2 p-3">
        {/* 类型 Badge */}
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className={`text-xs ${colors.bg} ${colors.text}`}>
            {label}
          </Badge>
          {clip.isFavorite && (
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
          )}
        </div>

        {/* 内容预览 */}
        <p className="line-clamp-2 text-sm text-foreground/80">
          {clip.contentPreview || clip.content}
        </p>

        {/* 底部元信息 */}
        <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatTime(clip.createdAt)}</span>
          <span className="truncate max-w-[120px]">{clip.sourceDevice}</span>
        </div>
      </CardContent>
    </Card>
  );
}
