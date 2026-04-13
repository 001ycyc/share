"use client";

/**
 * @module components/clipboard/PasteZone
 * @description 粘贴/拖拽上传区域组件，支持剪贴板粘贴、文件拖拽和点击上传。
 * @author ClipSync Team
 * @created 2026-04-12
 */

import { useCallback, useRef, useState } from "react";
import { ClipboardPaste, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Props ────────────────────────────────────────────────

interface PasteZoneProps {
  /** 粘贴/上传内容回调，content 为文本，files 为可选的文件列表 */
  onPaste: (content: string, files?: File[]) => void;
  /** 自定义容器类名 */
  className?: string;
}

// ── 组件 ─────────────────────────────────────────────────

/**
 * 粘贴/拖拽上传区域。
 *
 * 支持三种输入方式：
 * 1. **剪贴板粘贴**：监听 `paste` 事件，提取文本和文件。
 * 2. **拖拽上传**：监听 `dragOver`、`dragLeave`、`drop` 事件。
 * 3. **点击上传**：点击区域触发隐藏的 `<input type="file">`。
 *
 * 拖拽进入时显示高亮边框和背景色。
 */
export function PasteZone({ onPaste, className }: PasteZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** 处理剪贴板粘贴事件 */
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();

      const text = e.clipboardData.getData("text/plain") || "";
      const files: File[] = Array.from(e.clipboardData.files);

      if (files.length > 0) {
        onPaste(text, files);
      } else if (text) {
        onPaste(text);
      }
    },
    [onPaste],
  );

  /** 处理拖拽进入 */
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  /** 处理拖拽离开 */
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  /** 处理文件拖放 */
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const text = e.dataTransfer.getData("text/plain") || "";
      const files: File[] = Array.from(e.dataTransfer.files);

      if (files.length > 0) {
        onPaste(text, files);
      } else if (text) {
        onPaste(text);
      }
    },
    [onPaste],
  );

  /** 处理点击上传 */
  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /** 处理文件选择 */
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (files.length > 0) {
        onPaste("", files);
      }
      // 重置 input 以允许重复选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onPaste],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onPaste={handlePaste}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors",
        isDragging
          ? "border-brand-500 bg-brand-50"
          : "border-gray-300 bg-gray-50/50 hover:border-brand-400 hover:bg-brand-50/50",
        className,
      )}
    >
      {/* 图标 */}
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
          isDragging ? "bg-brand-100" : "bg-gray-100",
        )}
      >
        {isDragging ? (
          <Upload className="h-6 w-6 text-brand-600" />
        ) : (
          <ClipboardPaste className="h-6 w-6 text-gray-400" />
        )}
      </div>

      {/* 提示文字 */}
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          {isDragging ? "松开以上传文件" : "粘贴、拖拽或点击上传"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          支持 Ctrl+V 粘贴文本或图片
        </p>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
