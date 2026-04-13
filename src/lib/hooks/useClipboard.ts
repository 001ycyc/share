"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useClipStore } from "@/stores/clip.store";
import { useUIStore } from "@/stores/ui.store";
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
 * 获取当前登录用户的 UUID。
 * 从 Supabase Auth session 中提取用户 ID，用于数据库查询。
 *
 * @returns 当前用户的 UUID 字符串
 * @throws {Error} 当用户未登录时抛出错误
 */
async function getCurrentUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("用户未登录，请先登录");
  }
  return user.id;
}

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

/** 根据文件 MIME 类型判断剪贴板内容类型 */
function detectFileType(file: File): ClipType {
  const mime = file.type.toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "music";
  return "file";
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
    clearSelection,
  } = useClipStore();

  const searchQuery = useUIStore((s) => s.searchQuery);

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
      const userId = await getCurrentUserId();
      const result = await getClips(userId, { ...filters, search: searchQuery || undefined });
      setClips(result.clips, result.total, result.totalPages, result.page);
    } catch (error) {
      const result = handleError(error);
      toast.error(result.userMessage);
    } finally {
      setLoading(false);
    }
  }, [filters, searchQuery, setClips, setLoading]);

  /**
   * 按类型加载剪贴板数量统计。
   * 调用 getClipCountsByType 仓库方法，更新本地 state。
   */
  const loadTypeCounts = useCallback(async () => {
    try {
      const userId = await getCurrentUserId();
      const counts = await getClipCountsByType(userId);
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
          const userId = await getCurrentUserId();
          for (const file of files) {
            const input: CreateClipInput = {
              type: detectFileType(file),
              content: file.name,
              file,
              sourceDevice: "Web",
            };
            const clip = await createClip(userId, input);
            addClip(clip);
          }
          toast.success(`已添加 ${files.length} 个文件`);
        } else {
          // 处理文本类型
          const userId = await getCurrentUserId();
          const type = detectContentType(text);
          const input: CreateClipInput = {
            type,
            content: text,
            sourceDevice: "Web",
          };
          const clip = await createClip(userId, input);
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
        const userId = await getCurrentUserId();
        const newFavorite = await toggleFavorite(id, userId);
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
      // 文件类型：下载文件
      if (clip.fileUrl && (clip.type === "file" || clip.type === "image" || clip.type === "video" || clip.type === "music")) {
        const response = await fetch(clip.fileUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = clip.content; // clip.content 存的是文件名
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("已开始下载");
        return;
      }
      // 链接类型：复制链接
      if (clip.type === "link") {
        await navigator.clipboard.writeText(clip.content);
        toast.success("链接已复制");
        return;
      }
      // 文本类型：复制文本
      await navigator.clipboard.writeText(clip.content);
      toast.success("已复制到剪贴板");
    } catch {
      toast.error("操作失败，请重试");
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
        const userId = await getCurrentUserId();
        await deleteClip(id, userId);
        removeClip(id);
        toast.success("已移至回收站");
      } catch (error) {
        const result = handleError(error);
        toast.error(result.userMessage);
      }
    },
    [removeClip]
  );

  /**
   * 批量删除剪贴板条目。
   * 调用 deleteClip 仓库方法逐条执行软删除，清空选中状态，并刷新列表。
   *
   * @param ids - 要删除的剪贴板条目 ID 数组
   */
  const handleBatchDelete = useCallback(async (ids: string[]) => {
    try {
      const userId = await getCurrentUserId();
      for (const id of ids) {
        await deleteClip(id, userId);
      }
      clearSelection();
      loadClips();
      toast.success(`已删除 ${ids.length} 条记录`);
    } catch (error) {
      const result = handleError(error);
      toast.error(result.userMessage);
    }
  }, [clearSelection, loadClips]);

  /**
   * 批量收藏剪贴板条目。
   * 调用 toggleFavorite 仓库方法逐条切换收藏状态，清空选中状态，并刷新列表。
   *
   * @param ids - 要收藏的剪贴板条目 ID 数组
   */
  const handleBatchFavorite = useCallback(async (ids: string[]) => {
    try {
      const userId = await getCurrentUserId();
      for (const id of ids) {
        await toggleFavorite(id, userId);
      }
      clearSelection();
      loadClips();
      toast.success(`已收藏 ${ids.length} 条记录`);
    } catch (error) {
      const result = handleError(error);
      toast.error(result.userMessage);
    }
  }, [clearSelection, loadClips]);

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
    handleBatchDelete,
    handleBatchFavorite,
    handleFilterType,
    resetFilters,
    setFilter,
  };
}
