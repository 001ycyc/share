/**
 * @module lib/repository/clip
 * @description 剪贴板数据仓库层。
 *              封装所有与 clips 表相关的数据库操作，包括分页查询、创建、
 *              收藏切换、软删除和按类型统计等功能。
 * @author ClipSync Team
 * @created 2026-04-12
 */

import { createClient } from "@/lib/supabase/client";
import { AppError } from "@/lib/errors/app-error";
import type {
  Clip,
  ClipType,
  ClipFilterParams,
  ClipListResponse,
  CreateClipInput,
} from "@/types/clip";

/**
 * 根据剪贴板类型和内容自动生成标题。
 *
 * 对于不同类型的内容生成具有描述性的标题：
 * - text: 截取内容前 30 个字符作为标题
 * - link: 使用链接本身作为标题
 * - image: 生成 "图片 - {时间}" 格式标题
 * - file: 生成 "文件 - {时间}" 格式标题
 * - video: 生成 "视频 - {时间}" 格式标题
 * - music: 生成 "音乐 - {时间}" 格式标题
 *
 * @param type - 剪贴板内容类型
 * @param content - 剪贴板内容文本
 * @returns 自动生成的标题字符串
 */
function generateTitle(type: ClipType, content: string): string {
  const now = new Date().toLocaleString("zh-CN");

  switch (type) {
    case "text":
      return content.slice(0, 30).trim() || "无标题文本";
    case "link":
      return content.slice(0, 100).trim() || "无标题链接";
    case "image":
      return `图片 - ${now}`;
    case "file":
      return `文件 - ${now}`;
    case "video":
      return `视频 - ${now}`;
    case "music":
      return `音乐 - ${now}`;
    default:
      return "未命名剪贴板";
  }
}

/**
 * 分页查询用户剪贴板记录。
 *
 * 支持按类型、收藏状态、来源设备、关键词搜索和日期范围进行过滤，
 * 并返回分页结果及总页数信息。
 *
 * @param userId - 当前登录用户的唯一标识
 * @param filters - 查询过滤条件，包含分页参数和多种过滤选项
 * @param filters.type - 按剪贴板类型过滤，可选
 * @param filters.search - 关键词搜索，匹配标题和内容，可选
 * @param filters.isFavorite - 按收藏状态过滤，可选
 * @param filters.sourceDevice - 按来源设备过滤，可选
 * @param filters.dateFrom - 起始日期过滤（ISO 字符串），可选
 * @param filters.dateTo - 截止日期过滤（ISO 字符串），可选
 * @param filters.sortBy - 排序字段，默认 "createdAt"
 * @param filters.sortOrder - 排序方向，默认 "desc"
 * @param filters.page - 当前页码，默认 1
 * @param filters.pageSize - 每页条数，默认 20
 * @returns 包含剪贴板列表和分页信息的 ClipListResponse 对象
 * @throws {AppError} 当数据库查询失败时抛出 CLIP_005 错误
 */
export async function getClips(
  userId: string,
  filters: ClipFilterParams
): Promise<ClipListResponse> {
  const supabase = createClient();

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const sortBy = filters.sortBy ?? "createdAt";
  const sortOrder = filters.sortOrder ?? "desc";

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("clips")
    .select("*", { count: "exact" })
    .eq("userId", userId)
    .eq("isDeleted", false)
    .range(from, to)
    .order(sortBy, { ascending: sortOrder === "asc" });

  if (filters.type) {
    query = query.eq("type", filters.type);
  }

  if (filters.isFavorite !== undefined) {
    query = query.eq("isFavorite", filters.isFavorite);
  }

  if (filters.sourceDevice) {
    query = query.eq("sourceDevice", filters.sourceDevice);
  }

  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
  }

  if (filters.dateFrom) {
    query = query.gte("createdAt", filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte("createdAt", filters.dateTo);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new AppError("CLIP_005", {
      message: `Failed to query clips: ${error.message}`,
      details: { userId, filters, error },
    });
  }

  const clips = (data as Clip[]) ?? [];
  const total = count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    clips,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * 根据剪贴板 ID 获取单条记录。
 *
 * 查询指定 ID 的剪贴板记录，同时验证该记录属于当前用户且未被删除。
 *
 * @param clipId - 剪贴板的唯一标识
 * @param userId - 当前登录用户的唯一标识，用于权限校验
 * @returns 匹配的 Clip 对象
 * @throws {AppError} 当记录不存在或已被删除时抛出 CLIP_004 错误
 * @throws {AppError} 当数据库查询失败时抛出 CLIP_005 错误
 */
export async function getClipById(
  clipId: string,
  userId: string
): Promise<Clip> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("clips")
    .select("*")
    .eq("id", clipId)
    .eq("userId", userId)
    .eq("isDeleted", false)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new AppError("CLIP_004", {
        message: `Clip not found: ${clipId}`,
        details: { clipId, userId },
      });
    }
    throw new AppError("CLIP_005", {
      message: `Failed to fetch clip: ${error.message}`,
      details: { clipId, userId, error },
    });
  }

  return data as Clip;
}

/**
 * 创建新的剪贴板记录。
 *
 * 插入一条新的剪贴板记录到数据库中。如果未提供标题，则根据内容类型自动生成；
 * 自动截取内容前 200 个字符作为预览。
 *
 * @param userId - 当前登录用户的唯一标识
 * @param input - 创建剪贴板的输入数据
 * @param input.type - 剪贴板内容类型
 * @param input.title - 可选的自定义标题，未提供时自动生成
 * @param input.content - 剪贴板内容文本
 * @param input.file - 可选的文件对象（文件类型时使用）
 * @param input.metadata - 可选的元数据
 * @param input.sourceDevice - 来源设备标识
 * @returns 新创建的 Clip 对象
 * @throws {AppError} 当数据库插入失败时抛出 CLIP_005 错误
 */
export async function createClip(
  userId: string,
  input: CreateClipInput
): Promise<Clip> {
  const supabase = createClient();

  const title = input.title || generateTitle(input.type, input.content);
  const contentPreview = input.content.slice(0, 200);

  const { data, error } = await supabase
    .from("clips")
    .insert({
      userId,
      type: input.type,
      title,
      content: input.content,
      contentPreview,
      metadata: input.metadata ?? null,
      sourceDevice: input.sourceDevice,
      isFavorite: false,
      isDeleted: false,
    })
    .select()
    .single();

  if (error) {
    throw new AppError("CLIP_005", {
      message: `Failed to create clip: ${error.message}`,
      details: { userId, input, error },
    });
  }

  return data as Clip;
}

/**
 * 切换剪贴板的收藏状态。
 *
 * 获取当前收藏状态后取反并更新到数据库，返回更新后的收藏状态值。
 *
 * @param clipId - 剪贴板的唯一标识
 * @param userId - 当前登录用户的唯一标识，用于权限校验
 * @returns 更新后的 isFavorite 布尔值
 * @throws {AppError} 当记录不存在或已被删除时抛出 CLIP_004 错误
 * @throws {AppError} 当数据库操作失败时抛出 CLIP_005 错误
 */
export async function toggleFavorite(
  clipId: string,
  userId: string
): Promise<boolean> {
  const supabase = createClient();

  // 先获取当前状态
  const { data: current, error: fetchError } = await supabase
    .from("clips")
    .select("isFavorite")
    .eq("id", clipId)
    .eq("userId", userId)
    .eq("isDeleted", false)
    .single();

  if (fetchError) {
    if (fetchError.code === "PGRST116") {
      throw new AppError("CLIP_004", {
        message: `Clip not found for favorite toggle: ${clipId}`,
        details: { clipId, userId },
      });
    }
    throw new AppError("CLIP_005", {
      message: `Failed to fetch clip for favorite toggle: ${fetchError.message}`,
      details: { clipId, userId, error: fetchError },
    });
  }

  const newValue = !current.isFavorite;

  const { error: updateError } = await supabase
    .from("clips")
    .update({ isFavorite: newValue })
    .eq("id", clipId)
    .eq("userId", userId);

  if (updateError) {
    throw new AppError("CLIP_005", {
      message: `Failed to toggle favorite: ${updateError.message}`,
      details: { clipId, userId, error: updateError },
    });
  }

  return newValue;
}

/**
 * 软删除剪贴板记录。
 *
 * 将指定剪贴板的 isDeleted 字段设置为 true，而非从数据库中物理删除。
 *
 * @param clipId - 剪贴板的唯一标识
 * @param userId - 当前登录用户的唯一标识，用于权限校验
 * @returns Promise<void>，无返回值
 * @throws {AppError} 当数据库更新失败时抛出 CLIP_005 错误
 */
export async function deleteClip(
  clipId: string,
  userId: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("clips")
    .update({ isDeleted: true })
    .eq("id", clipId)
    .eq("userId", userId);

  if (error) {
    throw new AppError("CLIP_005", {
      message: `Failed to soft-delete clip: ${error.message}`,
      details: { clipId, userId, error },
    });
  }
}

/**
 * 按类型统计用户剪贴板数量。
 *
 * 查询用户所有未删除的剪贴板记录，并按类型分组统计数量。
 * 返回一个以 ClipType 为键、数量为值的对象。
 *
 * @param userId - 当前登录用户的唯一标识
 * @returns 以 ClipType 为键、对应数量为值的记录对象
 * @throws {AppError} 当数据库查询失败时抛出 CLIP_005 错误
 */
export async function getClipCountsByType(
  userId: string
): Promise<Record<ClipType, number>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("clips")
    .select("type")
    .eq("userId", userId)
    .eq("isDeleted", false);

  if (error) {
    throw new AppError("CLIP_005", {
      message: `Failed to count clips by type: ${error.message}`,
      details: { userId, error },
    });
  }

  const counts = {
    text: 0,
    image: 0,
    link: 0,
    file: 0,
    video: 0,
    music: 0,
  } as Record<ClipType, number>;

  for (const row of data ?? []) {
    const type = row.type as ClipType;
    if (type in counts) {
      counts[type]++;
    }
  }

  return counts;
}
