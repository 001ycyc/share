/**
 * @module stores/ui.store
 * @description UI 全局状态管理。
 * @author ClipSync Team
 * @created 2026-04-12
 */

import { create } from "zustand";

/** 视图模式类型 */
type ViewMode = "grid" | "list";

/** ui.store 的完整状态接口 */
interface UIState {
  /** 侧边栏是否展开 */
  sidebarOpen: boolean;
  /** 当前视图模式 */
  viewMode: ViewMode;
  /** 当前搜索关键词 */
  searchQuery: string;
  /** 搜索面板是否展开 */
  searchOpen: boolean;
  /** 搜索历史记录 */
  searchHistory: string[];
  /** 是否开启剪贴板自动捕获 */
  clipboardMonitoring: boolean;
}

/** ui.store 的操作接口 */
interface UIActions {
  /** 切换侧边栏展开/收起 */
  toggleSidebar: () => void;
  /** 设置侧边栏展开状态 */
  setSidebarOpen: (open: boolean) => void;
  /** 设置视图模式 */
  setViewMode: (mode: ViewMode) => void;
  /** 设置搜索关键词 */
  setSearchQuery: (query: string) => void;
  /** 设置搜索面板展开状态 */
  setSearchOpen: (open: boolean) => void;
  /** 添加搜索历史记录 */
  addSearchHistory: (query: string) => void;
  /** 清空搜索历史 */
  clearSearchHistory: () => void;
  /** 切换剪贴板自动捕获开关 */
  toggleClipboardMonitoring: () => void;
  /** 设置剪贴板自动捕获状态 */
  setClipboardMonitoring: (enabled: boolean) => void;
}

/**
 * UI Zustand store。
 *
 * 管理侧边栏状态、视图模式、搜索关键词及搜索面板开关。
 */
export const useUIStore = create<UIState & UIActions>()((set) => ({
  // ── State ──────────────────────────────────────────────
  sidebarOpen: true,
  viewMode: "grid" as ViewMode,
  searchQuery: "",
  searchOpen: false,
  searchHistory: [] as string[],
  clipboardMonitoring: true,

  // ── Actions ────────────────────────────────────────────
  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  setViewMode: (viewMode) => set({ viewMode }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setSearchOpen: (searchOpen) => set({ searchOpen }),

  addSearchHistory: (query) =>
    set((state) => {
      if (!query.trim()) return state;
      const filtered = state.searchHistory.filter((h) => h !== query);
      return { searchHistory: [query, ...filtered].slice(0, 10) };
    }),

  clearSearchHistory: () => set({ searchHistory: [] }),

  toggleClipboardMonitoring: () =>
    set((state) => ({ clipboardMonitoring: !state.clipboardMonitoring })),

  setClipboardMonitoring: (clipboardMonitoring) => set({ clipboardMonitoring }),
}));
