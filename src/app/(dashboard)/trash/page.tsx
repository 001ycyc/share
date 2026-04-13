"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { getDeletedClips, restoreClip, permanentDeleteClip } from "@/lib/repository/clip.repository";
import { handleError } from "@/lib/errors/handler";
import type { Clip } from "@/types/clip";

export default function TrashPage() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const loadDeletedClips = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const result = await getDeletedClips(user.id);
      setClips(result.clips);
      setTotal(result.total);
    } catch (error) {
      const result = handleError(error);
      toast.error(result.userMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDeletedClips(); }, [loadDeletedClips]);

  const handleRestore = async (id: string) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await restoreClip(id, user.id);
      toast.success("已恢复");
      loadDeletedClips();
    } catch (error) {
      const result = handleError(error);
      toast.error(result.userMessage);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await permanentDeleteClip(id, user.id);
      toast.success("已永久删除");
      loadDeletedClips();
    } catch (error) {
      const result = handleError(error);
      toast.error(result.userMessage);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">回收站</h1>
        <p className="text-muted-foreground">查看和恢复已删除的剪贴板内容（共 {total} 条）</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : clips.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <Trash2 className="h-12 w-12" />
          <p className="text-sm">回收站为空</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {clips.map((clip) => (
            <Card key={clip.id} className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{clip.title || clip.contentPreview}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">{clip.type}</Badge>
                  <span className="text-xs text-muted-foreground">
                    删除于 {new Date(clip.updatedAt).toLocaleString("zh-CN")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => handleRestore(clip.id)}>
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />恢复
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handlePermanentDelete(clip.id)}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" />永久删除
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
