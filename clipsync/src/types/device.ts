/**
 * @module types/device
 * @description 设备相关的 TypeScript 类型定义。
 * @author ClipSync Team
 * @created 2026-04-12
 */

export type Platform = "ios" | "android" | "windows" | "macOS" | "web";

export interface Device {
  id: string;
  userId: string;
  name: string;
  platform: Platform;
  deviceFingerprint: string;
  lastSyncAt: string;
  isOnline: boolean;
  createdAt: string;
}

export type SyncStatus = "synced" | "syncing" | "offline" | "error";

export interface RegisterDeviceInput {
  name: string;
  platform: Platform;
  deviceFingerprint: string;
}
