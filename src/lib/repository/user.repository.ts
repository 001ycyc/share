/**
 * @module lib/repository/user
 * @description 用户数据仓库层。
 *              封装所有与 users 表相关的数据库操作，包括用户查询与自动创建、
 *              用户统计数据聚合和存储空间用量更新等功能。
 * @author ClipSync Team
 * @created 2026-04-12
 */

import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors/app-error";
import type { User, UserStats } from "@/types/user";

/**
 * 获取或创建用户记录。
 *
 * 先根据 authUserId 查询用户是否已存在：
 * - 若存在，直接返回该用户记录
 * - 若不存在，使用 authUserId 和 email 创建新用户记录并返回
 * 确保认证系统中的用户在业务数据库中始终有对应的记录。
 *
 * @param authUserId - 认证系统中的用户唯一标识（Supabase Auth UID）
 * @param email - 用户邮箱地址，用于创建新用户记录
 * @returns 查询到或新创建的 User 对象
 * @throws {AppError} 当数据库查询或插入失败时抛出 AUTH_001 错误
 */
export async function getOrCreateUser(
  authUserId: string,
  email: string
): Promise<User> {
  const supabase = await createClient();

  // 先查询是否已存在
  const { data: existing, error: queryError } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUserId)
    .single();

  if (!queryError && existing) {
    return existing as User;
  }

  // 不存在则创建
  const { data, error: insertError } = await supabase
    .from("users")
    .insert({
      id: authUserId,
      email,
      displayName: email.split("@")[0],
      avatarUrl: null,
      storageUsed: 0,
      storageLimit: 104857600, // 100MB free tier default
      plan: "free",
    })
    .select()
    .single();

  if (insertError) {
    throw new AppError("AUTH_001", {
      message: `Failed to create user: ${insertError.message}`,
      details: { authUserId, email, error: insertError },
    });
  }

  return data as User;
}

/**
 * 获取用户统计数据。
 *
 * 聚合查询用户的各项统计数据，包括：
 * - todayClipCount: 今日创建的剪贴板数量
 * - favoriteCount: 收藏的剪贴板总数
 * - syncedDeviceCount: 在线设备数量
 * - totalDeviceCount: 注册设备总数
 * - storageUsed: 已使用的存储空间（字节）
 * - storageLimit: 存储空间上限（字节）
 *
 * @param userId - 用户的唯一标识
 * @returns 包含各项统计数据的 UserStats 对象
 * @throws {AppError} 当数据库查询失败时抛出 SYS_001 错误
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  const supabase = await createClient();

  // 获取用户基本信息（storageUsed, storageLimit）
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("storageUsed, storageLimit")
    .eq("id", userId)
    .single();

  if (userError) {
    throw new AppError("SYS_001", {
      message: `Failed to fetch user stats: ${userError.message}`,
      details: { userId, error: userError },
    });
  }

  // 获取今日剪贴板数量
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const { count: todayClipCount, error: todayError } = await supabase
    .from("clips")
    .select("*", { count: "exact", head: true })
    .eq("userId", userId)
    .eq("isDeleted", false)
    .gte("createdAt", todayISO);

  if (todayError) {
    throw new AppError("SYS_001", {
      message: `Failed to fetch today clip count: ${todayError.message}`,
      details: { userId, error: todayError },
    });
  }

  // 获取收藏数量
  const { count: favoriteCount, error: favError } = await supabase
    .from("clips")
    .select("*", { count: "exact", head: true })
    .eq("userId", userId)
    .eq("isDeleted", false)
    .eq("isFavorite", true);

  if (favError) {
    throw new AppError("SYS_001", {
      message: `Failed to fetch favorite count: ${favError.message}`,
      details: { userId, error: favError },
    });
  }

  // 获取设备统计
  const { data: devices, error: deviceError } = await supabase
    .from("devices")
    .select("isOnline")
    .eq("userId", userId);

  if (deviceError) {
    throw new AppError("SYS_001", {
      message: `Failed to fetch device stats: ${deviceError.message}`,
      details: { userId, error: deviceError },
    });
  }

  const totalDeviceCount = devices?.length ?? 0;
  const syncedDeviceCount = devices?.filter((d) => d.isOnline).length ?? 0;

  return {
    todayClipCount: todayClipCount ?? 0,
    favoriteCount: favoriteCount ?? 0,
    syncedDeviceCount,
    totalDeviceCount,
    storageUsed: user?.storageUsed ?? 0,
    storageLimit: user?.storageLimit ?? 104857600,
  };
}

/**
 * 更新用户存储空间用量。
 *
 * 以增量方式更新用户的 storageUsed 字段。delta 为正数表示增加用量
 * （如上传文件），为负数表示减少用量（如删除文件）。
 * 使用 SQL 表达式 `storageUsed + delta` 避免竞态条件。
 *
 * @param userId - 用户的唯一标识
 * @param delta - 存储空间变化量（字节），正数增加，负数减少
 * @returns Promise<void>，无返回值
 * @throws {AppError} 当数据库更新失败时抛出 STORAGE_001 错误
 */
export async function updateStorageUsed(
  userId: string,
  delta: number
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("update_storage_used", {
    p_user_id: userId,
    p_delta: delta,
  });

  // 如果 RPC 不存在，回退到直接更新
  if (error && error.message.includes("function") && error.message.includes("does not exist")) {
    // 先获取当前值再更新，避免竞态条件
    const { data: currentUser, error: fetchError } = await supabase
      .from("users")
      .select("storageUsed")
      .eq("id", userId)
      .single();

    if (fetchError) {
      throw new AppError("STORAGE_001", {
        message: `Failed to fetch current storage: ${fetchError.message}`,
        details: { userId, delta, error: fetchError },
      });
    }

    const newStorageUsed = Math.max((currentUser?.storageUsed ?? 0) + delta, 0);
    const { error: fallbackError } = await supabase
      .from("users")
      .update({
        storageUsed: newStorageUsed,
      })
      .eq("id", userId);

    if (fallbackError) {
      throw new AppError("STORAGE_001", {
        message: `Failed to update storage used: ${fallbackError.message}`,
        details: { userId, delta, error: fallbackError },
      });
    }

    return;
  }

  if (error) {
    throw new AppError("STORAGE_001", {
      message: `Failed to update storage used: ${error.message}`,
      details: { userId, delta, error },
    });
  }
}
