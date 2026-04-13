/**
 * @module stores/clip.store
 * @description 剪贴板全局状态管理。
 * @author ClipSync Team
 * @created 2026-04-12
 */

import { create } from "zustand";
import type { Clip, ClipFilterParams } from "@/types/clip";

/** clip.store 的完整状态接口 */
interface ClipState {
  /** 剪贴板条目列表 */
  clips: Clip[];
  /** 符合当前筛选条件的总条目数 */
  totalCount: number;
  /** 总页数 */
  totalPages: number;
  /** 当前页码 */
  currentPage: number;
  /** 数据加载中标志 */
  isLoading: boolean;
  /** 当前筛选参数 */
  filters: ClipFilterParams;
  /** 已选中的剪贴板条目 ID 集合 */
  selectedIds: Set<string>;
}

/** clip.store 的操作接口 */
interface ClipActions {
  /** 替换整个剪贴板列表及分页元数据 */
  setClips: (clips: Clip[], totalCount: number, totalPages: number, page: number) => void;
  /** 设置加载状态 */
  setLoading: (loading: boolean) => void;
  /** 合并筛选参数，并自动将页码重置为 1 */
  setFilter: (partial: Partial<ClipFilterParams>) => void;
  /** 重置所有筛选参数为默认值 */
  resetFilters: () => void;
  /** 在列表头部插入一条新的剪贴板条目 */
  addClip: (clip: Clip) => void;
  /** 根据 ID 移除一条剪贴板条目 */
  removeClip: (id: string) => void;
  /** 根据 ID 更新一条剪贴板条目 */
  updateClip: (id: string, updates: Partial<Clip>) => void;
  /** 切换某条目的选中状态 */
  toggleSelect: (id: string) => void;
  /** 选中当前列表中的所有条目（已全选时则取消全选） */
  selectAll: (clipIds?: string[]) => void;
  /** 清空所有选中状态 */
  clearSelection: () => void;
}

/** 默认筛选参数 */
const DEFAULT_FILTERS: ClipFilterParams = {
  page: 1,
  pageSize: 20,
  sortBy: "createdAt",
  sortOrder: "desc",
};

/**
 * 剪贴板 Zustand store。
 *
 * 管理剪贴板条目列表、分页信息、筛选条件以及批量选择状态。
 */
export const useClipStore = create<ClipState & ClipActions>()((set) => ({
  // ── State ──────────────────────────────────────────────
  clips: [],
  totalCount: 0,
  totalPages: 0,
  currentPage: 1,
  isLoading: false,
  filters: { ...DEFAULT_FILTERS },
  selectedIds: new Set<string>(),

  // ── Actions ────────────────────────────────────────────
  setClips: (clips, totalCount, totalPages, page) =>
    set({
      clips,
      totalCount,
      totalPages,
      currentPage: page,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setFilter: (partial) =>
    set((state) => ({
      filters: { ...state.filters, ...partial, page: 1 },
      currentPage: 1,
    })),

  resetFilters: () =>
    set({
      filters: { ...DEFAULT_FILTERS },
      currentPage: 1,
    }),

  addClip: (clip) =>
    set((state) => ({
      clips: [clip, ...state.clips],
      totalCount: state.totalCount + 1,
    })),

  removeClip: (id) =>
    set((state) => ({
      clips: state.clips.filter((c) => c.id !== id),
      totalCount: state.totalCount - 1,
      selectedIds: (() => {
        const next = new Set(state.selectedIds);
        next.delete(id);
        return next;
      })(),
    })),

  updateClip: (id, updates) =>
    set((state) => ({
      clips: state.clips.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      ),
    })),

  toggleSelect: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedIds: next };
    }),

  selectAll: (clipIds) =>
    set((state) => {
      const ids = clipIds ?? state.clips.map((c) => c.id);
      // 如果已经全选了，则取消全选
      if (ids.length > 0 && ids.every((id) => state.selectedIds.has(id))) {
        return { selectedIds: new Set<string>() };
      }
      return { selectedIds: new Set(ids) };
    }),

  clearSelection: () => set({ selectedIds: new Set<string>() }),
}));
