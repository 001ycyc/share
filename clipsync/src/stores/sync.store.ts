/**
 * @module stores/sync.store
 * @description 设备同步全局状态管理。
 * @author ClipSync Team
 * @created 2026-04-12
 */

import { create } from "zustand";
import type { Device, SyncStatus } from "@/types/device";

/** sync.store 的完整状态接口 */
interface SyncState {
  /** 已注册设备列表 */
  devices: Device[];
  /** 是否正在同步 */
  isSyncing: boolean;
  /** 上次同步完成的时间（ISO 字符串），null 表示从未同步 */
  lastSyncAt: string | null;
  /** 当前同步状态 */
  syncStatus: SyncStatus;
  /** 离线队列中待同步的操作数量 */
  offlineQueueCount: number;
}

/** sync.store 的操作接口 */
interface SyncActions {
  /** 替换整个设备列表 */
  setDevices: (devices: Device[]) => void;
  /** 更新指定设备的信息 */
  updateDevice: (id: string, updates: Partial<Device>) => void;
  /** 根据 ID 移除一台设备 */
  removeDevice: (id: string) => void;
  /** 设置同步进行中标志 */
  setSyncing: (syncing: boolean) => void;
  /** 记录上次同步完成时间 */
  setLastSync: (time: string | null) => void;
  /** 设置当前同步状态 */
  setSyncStatus: (status: SyncStatus) => void;
  /** 设置离线队列待同步操作数量 */
  setOfflineQueueCount: (count: number) => void;
}

/**
 * 设备同步 Zustand store。
 *
 * 管理已注册设备列表、同步状态、上次同步时间以及离线队列计数。
 */
export const useSyncStore = create<SyncState & SyncActions>()((set) => ({
  // ── State ──────────────────────────────────────────────
  devices: [],
  isSyncing: false,
  lastSyncAt: null,
  syncStatus: "offline" as SyncStatus,
  offlineQueueCount: 0,

  // ── Actions ────────────────────────────────────────────
  setDevices: (devices) => set({ devices }),

  updateDevice: (id, updates) =>
    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === id ? { ...d, ...updates } : d,
      ),
    })),

  removeDevice: (id) =>
    set((state) => ({
      devices: state.devices.filter((d) => d.id !== id),
    })),

  setSyncing: (isSyncing) => set({ isSyncing }),

  setLastSync: (lastSyncAt) => set({ lastSyncAt }),

  setSyncStatus: (syncStatus) => set({ syncStatus }),

  setOfflineQueueCount: (offlineQueueCount) => set({ offlineQueueCount }),
}));
