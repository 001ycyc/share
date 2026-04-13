/**
 * @module types/user
 * @description 用户相关的 TypeScript 类型定义。
 * @author ClipSync Team
 * @created 2026-04-12
 */

export type UserPlan = "free" | "pro";

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  storageUsed: number;
  storageLimit: number;
  plan: UserPlan;
  createdAt: string;
}

export interface UserStats {
  todayClipCount: number;
  favoriteCount: number;
  syncedDeviceCount: number;
  totalDeviceCount: number;
  storageUsed: number;
  storageLimit: number;
}
