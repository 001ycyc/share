/**
 * @module types/clip
 * @description 剪贴板相关的 TypeScript 类型定义。
 * @author ClipSync Team
 * @created 2026-04-12
 */

export type ClipType = "text" | "image" | "link" | "file" | "video" | "music";

export interface Clip {
  id: string;
  userId: string;
  type: ClipType;
  title: string;
  content: string;
  contentPreview: string;
  fileUrl: string | null;
  fileSize: number | null;
  mimeType: string | null;
  metadata: ClipMetadata | null;
  sourceDevice: string;
  isFavorite: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClipMetadata {
  width?: number;
  height?: number;
  duration?: number;
  bitrate?: number;
  artist?: string;
  album?: string;
  language?: string;
  [key: string]: unknown;
}

export interface CreateClipInput {
  type: ClipType;
  title?: string;
  content: string;
  file?: File;
  metadata?: ClipMetadata;
  sourceDevice: string;
}

export interface ClipFilterParams {
  type?: ClipType;
  search?: string;
  isFavorite?: boolean;
  sourceDevice?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface ClipListResponse {
  clips: Clip[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
