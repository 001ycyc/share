"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { handleError } from "@/lib/errors/handler";
import Link from "next/link";

interface ErrorCode {
  id: string;
  code: string;
  message: string;
  description: string;
  severity: string;
  updatedAt: string;
}

export default function ErrorCodesPage() {
  const [codes, setCodes] = useState<ErrorCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState("");

  useEffect(() => {
    async function loadCodes() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("error_codes")
          .select("*")
          .order("code", { ascending: true });
        if (error) throw error;
        setCodes((data as ErrorCode[]) ?? []);
      } catch (error) {
        const result = handleError(error);
        toast.error(result.userMessage);
      } finally {
        setLoading(false);
      }
    }
    loadCodes();
  }, []);

  const handleEdit = (code: ErrorCode) => {
    setEditingId(code.id);
    setEditMessage(code.message);
  };

  const handleSave = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("error_codes")
        .update({ message: editMessage })
        .eq("id", id);
      if (error) throw error;
      setCodes(codes.map(c => c.id === id ? { ...c, message: editMessage } : c));
      setEditingId(null);
      toast.success("已更新");
    } catch (error) {
      const result = handleError(error);
      toast.error(result.userMessage);
    }
  };

  const handleReset = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("reset_error_codes");
      if (error) {
        // 如果 RPC 不存在，静默处理
        toast.info("重置功能需要数据库函数支持");
        return;
      }
      toast.success("已重置为默认值");
      window.location.reload();
    } catch {
      toast.info("重置功能需要数据库函数支持");
    }
  };

  const severityColors: Record<string, string> = {
    low: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="icon-sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">错误代码管理</h1>
          <p className="text-sm text-muted-foreground">自定义错误提示信息，修改后实时生效</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="mr-1 h-3.5 w-3.5" />恢复默认
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">加载中...</div>
      ) : (
        <div className="space-y-3">
          {codes.map((code) => (
            <Card key={code.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-sm font-mono font-bold">{code.code}</code>
                    <Badge variant="secondary" className={severityColors[code.severity] || ""}>
                      {code.severity}
                    </Badge>
                  </div>
                  {editingId === code.id ? (
                    <div className="flex items-center gap-2">
                      <Input value={editMessage} onChange={(e) => setEditMessage(e.target.value)} className="flex-1" />
                      <Button size="sm" onClick={() => handleSave(code.id)}>
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>取消</Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{code.message}</p>
                  )}
                  {code.description && editingId !== code.id && (
                    <p className="text-xs text-muted-foreground/60 mt-1">{code.description}</p>
                  )}
                </div>
                {editingId !== code.id && (
                  <Button variant="outline" size="sm" onClick={() => handleEdit(code)}>编辑</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
