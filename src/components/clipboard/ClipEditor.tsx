"use client";

/**
 * @module components/clipboard/ClipEditor
 * @description 富文本编辑器组件，基于 Tiptap 实现，用于编辑剪贴板文本内容。
 * @author ClipSync Team
 * @created 2026-04-12
 */

import { useCallback } from "react";
import { Bold, Italic, List, Code, Link as LinkIcon, Save, X } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Props ────────────────────────────────────────────────

interface ClipEditorProps {
  /** 编辑器初始内容（纯文本或 HTML） */
  initialContent?: string;
  /** 保存内容回调，返回编辑器中的纯文本 */
  onSave: (content: string) => void;
  /** 取消编辑回调 */
  onCancel?: () => void;
  /** 自定义容器类名 */
  className?: string;
}

// ── 工具栏按钮 ───────────────────────────────────────────

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  children: React.ReactNode;
  title: string;
}

/** 工具栏按钮子组件 */
function ToolbarButton({ onClick, isActive, children, title }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={onClick}
      title={title}
      className={cn(isActive && "bg-brand-100 text-brand-700")}
    >
      {children}
    </Button>
  );
}

// ── 组件 ─────────────────────────────────────────────────

/**
 * 富文本编辑器。
 *
 * 基于 `@tiptap/react`，内置 StarterKit 和 Link 扩展。
 * - 工具栏提供：加粗、斜体、无序列表、代码块、链接按钮。
 * - 编辑区域使用 `prose` 排版样式。
 * - 底部提供保存和取消按钮。
 */
export function ClipEditor({
  initialContent = "",
  onSave,
  onCancel,
  className,
}: ClipEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-brand-600 underline hover:text-brand-800",
        },
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[120px] px-3 py-2 focus:outline-none text-sm",
      },
    },
  });

  /** 设置链接 */
  const handleSetLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("请输入链接地址", previousUrl || "https://");

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  /** 保存 */
  const handleSave = useCallback(() => {
    if (!editor) return;
    onSave(editor.getText());
  }, [editor, onSave]);

  return (
    <div className={cn("flex flex-col rounded-xl border ring-1 ring-foreground/10 overflow-hidden", className)}>
      {/* 工具栏 */}
      <div className="flex items-center gap-1 border-b bg-muted/50 px-2 py-1">
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBold().run()}
          isActive={editor?.isActive("bold")}
          title="加粗"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          isActive={editor?.isActive("italic")}
          title="斜体"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          isActive={editor?.isActive("bulletList")}
          title="无序列表"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          isActive={editor?.isActive("codeBlock")}
          title="代码块"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={handleSetLink}
          isActive={editor?.isActive("link")}
          title="插入链接"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* 编辑区域 */}
      <div className="bg-background">
        <EditorContent editor={editor} />
      </div>

      {/* 底部操作栏 */}
      <div className="flex items-center justify-end gap-2 border-t bg-muted/50 px-3 py-2">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            <X className="mr-1 h-4 w-4" />
            取消
          </Button>
        )}
        <Button type="button" size="sm" onClick={handleSave}>
          <Save className="mr-1 h-4 w-4" />
          保存
        </Button>
      </div>
    </div>
  );
}
