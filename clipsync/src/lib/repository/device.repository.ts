/**
 * @module lib/repository/device
 * @description 设备数据仓库层。
 *              封装所有与 devices 表相关的数据库操作，包括设备注册（Upsert）、
 *              设备列表查询、在线状态更新和设备移除等功能。
 * @author ClipSync Team
 * @created 2026-04-12
 */

import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors/app-error";
import type { Device, RegisterDeviceInput } from "@/types/device";

/**
 * 注册或更新设备信息（Upsert）。
 *
 * 根据 deviceFingerprint 判断设备是否已存在：
 * - 若已存在，更新设备的名称、平台和最后同步时间
 * - 若不存在，创建新的设备记录
 * 使用 Supabase 的 upsert 实现幂等操作。
 *
 * @param userId - 当前登录用户的唯一标识
 * @param input - 设备注册输入数据
 * @param input.name - 设备名称
 * @param input.platform - 设备平台类型（ios / android / windows / macOS / web）
 * @param input.deviceFingerprint - 设备唯一指纹标识
 * @returns 注册或更新后的 Device 对象
 * @throws {AppError} 当数据库操作失败时抛出 SYNC_001 错误
 */
export async function registerDevice(
  userId: string,
  input: RegisterDeviceInput
): Promise<Device> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("devices")
    .upsert(
      {
        userId,
        name: input.name,
        platform: input.platform,
        deviceFingerprint: input.deviceFingerprint,
        lastSyncAt: new Date().toISOString(),
        isOnline: true,
      },
      { onConflict: "userId,deviceFingerprint" }
    )
    .select()
    .single();

  if (error) {
    throw new AppError("SYNC_001", {
      message: `Failed to register device: ${error.message}`,
      details: { userId, input, error },
    });
  }

  return data as Device;
}

/**
 * 获取用户的所有设备列表。
 *
 * 查询指定用户的所有设备记录，按最后同步时间降序排列，
 * 最近同步的设备排在最前面。
 *
 * @param userId - 当前登录用户的唯一标识
 * @returns 按最后同步时间降序排列的 Device 数组
 * @throws {AppError} 当数据库查询失败时抛出 SYNC_001 错误
 */
export async function getDevices(userId: string): Promise<Device[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .eq("userId", userId)
    .order("lastSyncAt", { ascending: false });

  if (error) {
    throw new AppError("SYNC_001", {
      message: `Failed to fetch devices: ${error.message}`,
      details: { userId, error },
    });
  }

  return (data as Device[]) ?? [];
}

/**
 * 更新设备的在线状态。
 *
 * 将指定设备的 isOnline 字段更新为给定值，通常由心跳检测或
 * 同步操作触发调用。
 *
 * @param deviceId - 设备的唯一标识
 * @param isOnline - 设备当前是否在线
 * @returns Promise<void>，无返回值
 * @throws {AppError} 当数据库更新失败时抛出 SYNC_001 错误
 */
export async function updateDeviceOnlineStatus(
  deviceId: string,
  isOnline: boolean
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("devices")
    .update({ isOnline })
    .eq("id", deviceId);

  if (error) {
    throw new AppError("SYNC_001", {
      message: `Failed to update device online status: ${error.message}`,
      details: { deviceId, isOnline, error },
    });
  }
}

/**
 * 移除用户设备。
 *
 * 从数据库中物理删除指定设备记录，操作前会验证设备属于当前用户，
 * 确保用户只能移除自己的设备。
 *
 * @param deviceId - 设备的唯一标识
 * @param userId - 当前登录用户的唯一标识，用于权限校验
 * @returns Promise<void>，无返回值
 * @throws {AppError} 当数据库删除失败时抛出 SYNC_001 错误
 */
export async function removeDevice(
  deviceId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("devices")
    .delete()
    .eq("id", deviceId)
    .eq("userId", userId);

  if (error) {
    throw new AppError("SYNC_001", {
      message: `Failed to remove device: ${error.message}`,
      details: { deviceId, userId, error },
    });
  }
}
