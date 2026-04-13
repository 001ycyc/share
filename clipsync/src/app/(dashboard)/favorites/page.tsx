"use client";

import { useClipboard } from "@/lib/hooks/useClipboard";
import { ClipList } from "@/components/clipboard/ClipList";

/**
 * 收藏页面。
 *
 * 展示用户收藏的剪贴板内容，仅显示 isFavorite 为 true 的条目。
 */
export default function FavoritesPage() {
  const {
    clips,
    isLoading,
    handleToggleFavorite,
    handleCopy,
    handleDelete,
  } = useClipboard();

  const favoriteClips = clips.filter((clip) => clip.isFavorite);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">收藏</h1>
        <p className="text-muted-foreground">你收藏的重要剪贴板内容</p>
      </div>

      {/* Favorite Clips List */}
      <ClipList
        clips={favoriteClips}
        isLoading={isLoading}
        onToggleFavorite={handleToggleFavorite}
        onCopy={handleCopy}
        onDelete={handleDelete}
      />
    </div>
  );
}
