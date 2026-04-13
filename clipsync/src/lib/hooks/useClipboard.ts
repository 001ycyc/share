"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useClipStore } from "@/stores/clip.store";
import {
  getClips,
  getClipCountsByType,
  createClip,
  toggleFavorite,
  deleteClip,
} from "@/lib/repository/clip.repository";
import { handleError } from "@/lib/errors/handler";
import type { Clip, ClipType, CreateClipInput } from "@/types/clip";

/**
 * 根据文本内容自动检测剪贴板类型。
 *
 * 检测规则：
 * - 以 http:// 或 https:// 开头 => link
 * - 包含常见图片扩展名 => image
 * - 包含常见视频扩展名 => video
 * - 包含常见音频扩展名 => music
 * - 其他 => text
 */
function detectContentType(text: string): ClipType {
  if (/^https?:\/\//i.test(text)) return "link";
  if (/\.(png|jpe?g|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(text)) return "image";
  if (/\.(mp4|webm|mov|avi|mkv|flv)(\?.*)?$/i.test(text)) return "video";
  if (/\.(mp3|wav|ogg|flac|aac|m4a)(\?.*)?$/i.test(text)) return "music";
  return "text";
}

/**
 * useClipboard hook
 *
 * 封装所有剪贴板操作，包括加载、创建、复制、删除、收藏切换和类型过滤。
 * 使用 useClipStore 进行状态管理，通过 toast 显示操作反馈。
 */
export function useClipboard() {
  const {
    clips,
    totalCount,
    totalPages,
    currentPage,
    isLoading,
    filters,
    setClips,
    setLoading,
    setFilter,
    resetFilters,
    addClip,
    removeClip,
    updateClip,
  } = useClipStore();

  const [typeCounts, setTypeCounts] = useState<Record<ClipType, number>>({
    text: 0,
    image: 0,
    link: 0,
    file: 0,
    video: 0,
    music: 0,
  });

  /**
   * 加载剪贴板列表。
   * 调用 getClips 仓库方法获取分页数据，并更新 store。
   */
  const loadClips = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getClips("current-user", filters);
      setClips(result.clips, result.total, result.totalPages, result.page);
    } catch (error) {
      const result = handleError(error);
      toast.error(result.userMessage);
    } finally {
      setLoading(false);
    }
  }, [filters, setClips, setLoading]);

  /**
   * 按类型加载剪贴板数量统计。
   * 调用 getClipCountsByType 仓库方法，更新本地 state。
   */
  const loadTypeCounts = useCallback(async () => {
    try {
      const counts = await getClipCountsByType("current-user");
      setTypeCounts(counts);
    } catch (error) {
      const result = handleError(error);
      toast.error(result.userMessage);
    }
  }, []);

  /**
   * 处理粘贴操作。
   * 自动检测内容类型，调用 createClip 创建记录，添加到 store，并显示 toast。
   *
   * @param text - 粘贴的文本内容
   * @param files - 可选的文件列表
   */
  const handlePaste = useCallback(
    async (text: string, files?: File[]) => {
      try {
        if (files && files.length > 0) {
          // 处理文件类型
          for (const file of files) {
            const input: CreateClipInput = {
              type: "file",
              content: file.name,
              file,
              sourceDevice: "Web",
            };
            const clip = await createClip("current-user", input);
            addClip(clip);
          }
          toast.success(`已添加 ${files.length} 个文件`);
        } else {
          // 处理文本类型
          const type = detectContentType(text);
          const input: CreateClipInput = {
            type,
            content: text,
            sourceDevice: "Web",
          };
          const clip = await createClip("current-user", input);
          addClip(clip);
          toast.success("已添加到剪贴板");
        }
      } catch (error) {
        const result = handleError(error);
        toast.error(result.userMessage);
      }
    },
    [addClip]
  );

  /**
   * 切换收藏状态。
   * 调用 toggleFavorite 仓库方法，更新 store，并显示 toast。
   *
   * @param id - 剪贴板条目 ID
   */
  const handleToggleFavorite = useCallback(
    async (id: string) => {
      try {
        const newFavorite = await toggleFavorite(id, "current-user");
        updateClip(id, { isFavorite: newFavorite });
        toast.success(newFavorite ? "已收藏" : "已取消收藏");
      } catch (error) {
        const result = handleError(error);
        toast.error(result.userMessage);
      }
    },
    [updateClip]
  );

  /**
   * 复制剪贴板内容到系统剪贴板。
   * 使用 navigator.clipboard.writeText，并显示 toast。
   *
   * @param clip - 要复制的剪贴板条目
   */
  const handleCopy = useCallback(async (clip: Clip) => {
    try {
      await navigator.clipboard.writeText(clip.content);
      toast.success("已复制到剪贴板");
    } catch {
      toast.error("复制失败，请手动复制");
    }
  }, []);

  /**
   * 删除剪贴板条目。
   * 调用 deleteClip 仓库方法执行软删除，从 store 中移除，并显示 toast。
   *
   * @param id - 要删除的剪贴板条目 ID
   */
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteClip(id, "current-user");
        removeClip(id);
        toast.success("已删除");
      } catch (error) {
        const result = handleError(error);
        toast.error(result.userMessage);
      }
    },
    [removeClip]
  );

  /**
   * 按类型过滤剪贴板列表。
   * 调用 store 的 setFilter 方法更新筛选条件。
   *
   * @param type - 要过滤的剪贴板类型，传 undefined 则清除类型过滤
   */
  const handleFilterType = useCallback(
    (type?: ClipType) => {
      setFilter({ type });
    },
    [setFilter]
  );

  // 当筛选条件变化时自动加载剪贴板列表
  useEffect(() => {
    loadClips();
  }, [loadClips]);

  // 当 totalCount 变化时重新加载类型统计
  useEffect(() => {
    loadTypeCounts();
  }, [totalCount, loadTypeCounts]);

  return {
    clips,
    totalCount,
    totalPages,
    currentPage,
    isLoading,
    filters,
    typeCounts,
    loadClips,
    loadTypeCounts,
    handlePaste,
    handleToggleFavorite,
    handleCopy,
    handleDelete,
    handleFilterType,
    resetFilters,
  };
}
