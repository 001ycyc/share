"use client";

import { useState, useRef } from "react";
import { Download, Upload, AlertTriangle, FileText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useClipStore } from "@/stores/clip.store";
import { exportAsJSON, exportAsCSV, exportAsZIP } from "@/lib/import-export/exporter";
import {
  parseJSONImport,
  parseCSVImport,
  type ImportPreview,
} from "@/lib/import-export/importer";
import { createClip } from "@/lib/repository/clip.repository";
import { createClient } from "@/lib/supabase/client";
import { handleError } from "@/lib/errors/handler";

async function getCurrentUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("用户未登录");
  return user.id;
}

/**
 * 数据导入/导出页面。
 *
 * 提供剪贴板数据的导出（JSON/CSV）和导入（JSON/CSV）功能。
 * 导入时支持文件预览、重复检测和确认导入。
 */
export default function ImportExportPage() {
  const { clips } = useClipStore();
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(
    null
  );
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** 处理 JSON 导出 */
  const handleExportJSON = () => {
    if (clips.length === 0) {
      toast.error("没有可导出的剪贴板内容");
      return;
    }
    try {
      exportAsJSON(clips);
      toast.success(`成功导出 ${clips.length} 条记录为 JSON`);
    } catch (error) {
      const result = handleError(error);
      toast.error(result.userMessage);
    }
  };

  /** 处理 CSV 导出 */
  const handleExportCSV = () => {
    if (clips.length === 0) {
      toast.error("没有可导出的剪贴板内容");
      return;
    }
    try {
      exportAsCSV(clips);
      const exportableCount = clips.filter(
        (c) => c.type === "text" || c.type === "link"
      ).length;
      toast.success(`成功导出 ${exportableCount} 条记录为 CSV`);
    } catch (error) {
      const result = handleError(error);
      toast.error(result.userMessage);
    }
  };

  /** 处理 ZIP 导出 */
  const handleExportZIP = async () => {
    if (clips.length === 0) {
      toast.error("没有可导出的剪贴板内容");
      return;
    }
    try {
      await exportAsZIP(clips);
      toast.success(`成功导出 ${clips.length} 条记录为 ZIP`);
    } catch (error) {
      const result = handleError(error);
      toast.error(result.userMessage);
    }
  };

  /** 处理导入文件选择 */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportPreview(null);

    try {
      let preview: ImportPreview;

      if (file.name.endsWith(".json")) {
        preview = await parseJSONImport(file, clips);
      } else if (file.name.endsWith(".csv")) {
        preview = await parseCSVImport(file, clips);
      } else {
        toast.error("不支持的文件格式，请选择 .json 或 .csv 文件");
        setImportFile(null);
        return;
      }

      setImportPreview(preview);
    } catch (error) {
      const result = handleError(error);
      toast.error(result.userMessage);
      setImportFile(null);
    }

    // 重置 file input 以允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /** 处理确认导入 */
  const handleConfirmImport = async () => {
    if (!importPreview) return;
    try {
      const userId = await getCurrentUserId();
      let importedCount = 0;
      for (const item of importPreview.items) {
        if (item.isDuplicate) continue;
        await createClip(userId, {
          type: item.type as "text" | "image" | "link" | "file" | "video" | "music",
          title: item.title,
          content: item.content,
          sourceDevice: "Web",
        });
        importedCount++;
      }
      toast.success(
        `成功导入 ${importedCount} 条新记录${importPreview.duplicates > 0 ? `，已跳过 ${importPreview.duplicates} 条重复记录` : ""}`
      );
      // 重新加载剪贴板列表
      window.location.reload();
    } catch (error) {
      const result = handleError(error);
      toast.error(result.userMessage);
    }
    setImportPreview(null);
    setImportFile(null);
  };

  /** 清除导入预览 */
  const handleClearImport = () => {
    setImportPreview(null);
    setImportFile(null);
  };

  const newItemsCount = importPreview
    ? importPreview.totalItems - importPreview.duplicates
    : 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          数据导入/导出
        </h1>
        <p className="text-muted-foreground">
          导出你的剪贴板数据或从文件中导入
        </p>
      </div>

      {/* Export Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>导出数据</CardTitle>
              <CardDescription>
                将你的剪贴板数据导出为 JSON 或 CSV 格式文件
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button onClick={handleExportJSON} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              导出 JSON
            </Button>
            <Button onClick={handleExportCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              导出 CSV
            </Button>
            <Button onClick={handleExportZIP} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              导出 ZIP
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>导入数据</CardTitle>
              <CardDescription>
                从 JSON 或 CSV 文件中导入剪贴板数据
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv"
              onChange={handleFileChange}
              className="hidden"
              id="import-file-input"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              选择文件
            </Button>
            <span className="ml-3 text-sm text-muted-foreground">
              支持 .json 和 .csv 格式
            </span>
          </div>

          {/* Import Preview Section */}
          {importPreview && importFile && (
            <div className="space-y-4 rounded-lg border p-4">
              {/* File Info */}
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{importFile.name}</span>
                <Badge variant="secondary">
                  共 {importPreview.totalItems} 条
                </Badge>
                {importPreview.duplicates > 0 && (
                  <Badge
                    variant="outline"
                    className="border-amber-500 text-amber-600"
                  >
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    {importPreview.duplicates} 条重复
                  </Badge>
                )}
              </div>

              {/* Preview List (max 10 items) */}
              <div className="space-y-2">
                {importPreview.items.slice(0, 10).map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-md bg-muted/50 px-3 py-2 text-sm"
                  >
                    <Badge variant="outline" className="shrink-0">
                      {item.type}
                    </Badge>
                    <span className="flex-1 truncate">
                      {item.title || item.content}
                    </span>
                    {item.isDuplicate && (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-amber-500 text-amber-600"
                      >
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        重复
                      </Badge>
                    )}
                  </div>
                ))}
                {importPreview.items.length > 10 && (
                  <p className="text-center text-xs text-muted-foreground">
                    还有 {importPreview.items.length - 10} 条记录未显示...
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleConfirmImport}
                  disabled={newItemsCount === 0}
                >
                  确认导入
                  {newItemsCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {newItemsCount} 条新记录
                    </Badge>
                  )}
                </Button>
                <Button variant="ghost" onClick={handleClearImport}>
                  取消
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
