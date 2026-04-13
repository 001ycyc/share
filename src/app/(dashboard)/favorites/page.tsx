"use client";

import { useEffect } from "react";
import { useClipboard } from "@/lib/hooks/useClipboard";
import { ClipList } from "@/components/clipboard/ClipList";

export default function FavoritesPage() {
  const {
    clips,
    isLoading,
    handleToggleFavorite,
    handleCopy,
    handleDelete,
    setFilter,
  } = useClipboard();

  useEffect(() => {
    setFilter({ isFavorite: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">收藏</h1>
        <p className="text-muted-foreground">你收藏的重要剪贴板内容</p>
      </div>
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
