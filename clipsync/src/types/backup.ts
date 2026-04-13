/**
 * @module types/backup
 * @description 备份相关的 TypeScript 类型定义。
 * @author ClipSync Team
 * @created 2026-04-12
 */

export type BackupType = "full" | "incremental" | "manual";
export type BackupStatus = "creating" | "completed" | "failed";

export interface Backup {
  id: string;
  userId: string;
  type: BackupType;
  fileUrl: string;
  fileSize: number;
  clipCount: number;
  status: BackupStatus;
  checksum: string;
  createdAt: string;
}

export interface BackupFile {
  version: string;
  type: BackupType;
  userId: string;
  createdAt: string;
  data: {
    clips: unknown[];
    devices: unknown[];
    settings: Record<string, unknown>;
  };
  checksum: string;
}
