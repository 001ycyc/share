"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  User, HardDrive, Database, Shield, Clock, Trash2,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BackupScheduler } from "@/lib/backup/scheduler";
import { handleError } from "@/lib/errors/handler";
import { checkQuota, getQuotaWarningMessage } from "@/lib/storage/quota";
import type { Backup } from "@/types/backup";

/**
 * 使用客户端 Supabase 直接查询备份列表。
 * 服务端模块 getBackupList 依赖 cookies()，无法在客户端组件中调用。
 */
async function fetchBackupList(userId: string): Promise<Backup[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("backups")
    .select("*")
    .eq("userId", userId)
    .order("createdAt", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch backup list: ${error.message}`);
  }

  return (data as Backup[]) ?? [];
}

/**
 * 使用客户端 Supabase 直接执行清理操作。
 * 服务端模块 cleanupExpiredClips 依赖 cookies()，无法在客户端组件中调用。
 */
async function clientCleanupExpiredClips(
  userId: string,
  daysOld: number
): Promise<{ cleaned: number; spaceFreed: number }> {
  const supabase = createClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const { data: expiredClips, error: fetchError } = await supabase
    .from("clips")
    .select("id, fileSize")
    .eq("userId", userId)
    .eq("isDeleted", false)
    .eq("isFavorite", false)
    .lt("createdAt", cutoffDate.toISOString());

  if (fetchError) {
    throw new Error(`Failed to fetch expired clips: ${fetchError.message}`);
  }

  if (!expiredClips || expiredClips.length === 0) {
    return { cleaned: 0, spaceFreed: 0 };
  }

  const clipIds = expiredClips.map((clip) => clip.id);
  const spaceFreed = expiredClips.reduce(
    (sum, clip) => sum + (clip.fileSize || 0),
    0
  );

  const { error: updateError } = await supabase
    .from("clips")
    .update({ isDeleted: true })
    .in("id", clipIds);

  if (updateError) {
    throw new Error(`Failed to mark clips as deleted: ${updateError.message}`);
  }

  return {
    cleaned: expiredClips.length,
    spaceFreed,
  };
}

export default function SettingsPage() {
  // 用户信息
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [plan, setPlan] = useState("free");

  // 存储信息
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageLimit, setStorageLimit] = useState(104857600);

  // 备份设置
  const [autoBackup, setAutoBackup] = useState(false);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const schedulerRef = useRef<BackupScheduler | null>(null);

  // 清理设置
  const [autoCleanup, setAutoCleanup] = useState(false);
  const [retentionDays, setRetentionDays] = useState("90");

  // 加载用户数据
  useEffect(() => {
    async function loadUserData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setEmail(user.email ?? "");
        setDisplayName(user.user_metadata?.display_name || user.email?.split("@")[0] || "用户");

        const { data: userData } = await supabase
          .from("users")
          .select("storageUsed, storageLimit, plan, displayName")
          .eq("id", user.id)
          .single();

        if (userData) {
          setStorageUsed(userData.storageUsed ?? 0);
          setStorageLimit(userData.storageLimit ?? 104857600);
          setPlan(userData.plan ?? "free");
          if (userData.displayName) setDisplayName(userData.displayName);
        }
      } catch {
        // 静默失败
      }
    }
    loadUserData();
  }, []);

  // 加载备份列表
  const loadBackups = useCallback(async () => {
    setBackupLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const list = await fetchBackupList(user.id);
      setBackups(list);
    } catch (error) {
      const result = handleError(error);
      toast.error(result.userMessage);
    } finally {
      setBackupLoading(false);
    }
  }, []);

  useEffect(() => { loadBackups(); }, [loadBackups]);

  // 自动备份开关
  const handleAutoBackupChange = async (checked: boolean) => {
    setAutoBackup(checked);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (checked) {
        const scheduler = new BackupScheduler(user.id);
        scheduler.startDailyIncremental();
        schedulerRef.current = scheduler;
        toast.success("已启用自动备份（每日增量）");
      } else {
        schedulerRef.current?.stopAll();
        schedulerRef.current = null;
        toast.success("已关闭自动备份");
      }
    } catch (error) {
      const result = handleError(error);
      toast.error(result.userMessage);
      setAutoBackup(!checked);
    }
  };

  // 立即备份
  const handleBackupNow = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const scheduler = new BackupScheduler(user.id);
      toast.info("正在创建备份...");
      await scheduler.runNow(user.id, "full");
      toast.success("备份创建成功");
      loadBackups();
    } catch (error) {
      const result = handleError(error);
      toast.error(result.userMessage);
    }
  };

  // 清理存储
  const handleCleanup = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      toast.info("正在清理...");
      const result = await clientCleanupExpiredClips(user.id, parseInt(retentionDays));
      toast.success(`清理完成，释放了 ${result.cleaned} 条记录`);
      // 重新加载存储信息
      const { data: userData } = await supabase
        .from("users")
        .select("storageUsed")
        .eq("id", user.id)
        .single();
      if (userData) setStorageUsed(userData.storageUsed ?? 0);
    } catch (error) {
      const result = handleError(error);
      toast.error(result.userMessage);
    }
  };

  // 修改显示名称
  const handleUpdateProfile = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("users")
        .update({ displayName })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("资料已更新");
    } catch (error) {
      const result = handleError(error);
      toast.error(result.userMessage);
    }
  };

  const handleClearAllData = async () => {
    if (!confirm("确定要清空所有剪贴板数据吗？此操作不可撤销！")) return;
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("clips")
        .update({ isDeleted: true })
        .eq("userId", user.id)
        .eq("isDeleted", false);
      if (error) throw error;
      toast.success("所有数据已移至回收站");
    } catch (error) {
      const result = handleError(error);
      toast.error(result.userMessage);
    }
  };

  const handleExportAndDelete = async () => {
    if (!confirm("确定要导出数据并删除账号吗？此操作不可撤销！")) return;
    try {
      const supabase = createClient();
      // 先导出
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: clips } = await supabase
        .from("clips")
        .select("*")
        .eq("userId", user.id);
      if (clips && clips.length > 0) {
        const blob = new Blob([JSON.stringify(clips, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `clipsync-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      // 删除用户数据
      await supabase.from("clips").delete().eq("userId", user.id);
      await supabase.from("devices").delete().eq("userId", user.id);
      await supabase.from("backups").delete().eq("userId", user.id);
      await supabase.auth.signOut();
      toast.success("数据已导出，账号已删除");
      window.location.href = "/login";
    } catch (error) {
      const result = handleError(error);
      toast.error(result.userMessage);
    }
  };

  const storagePercent = storageLimit > 0 ? Math.round((storageUsed / storageLimit) * 100) : 0;
  const formatStorage = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">设置</h1>
        <p className="text-muted-foreground">管理你的账号、存储和偏好设置</p>
      </div>

      {/* 账号信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="size-4" />账号信息</CardTitle>
          <CardDescription>查看和管理你的账号基本信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">邮箱</p>
              <p className="font-medium">{email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">显示名称</p>
            </div>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-48" />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">当前套餐</p>
              <Badge>{plan === "free" ? "免费版" : "Pro 版"}</Badge>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleUpdateProfile}>保存资料</Button>
          </div>
        </CardContent>
      </Card>

      {/* 存储管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><HardDrive className="size-4" />存储管理</CardTitle>
          <CardDescription>查看和管理你的存储空间使用情况</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">已使用空间</span>
              <span className="font-medium">{formatStorage(storageUsed)} / {formatStorage(storageLimit)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(storagePercent, 100)}%` }} />
            </div>
          </div>
          {/* 配额预警 */}
          {(() => {
            const quota = checkQuota(storageUsed, storageLimit);
            const warning = getQuotaWarningMessage(quota);
            if (!warning) return null;
            const colors = quota.level === "warning" ? "text-yellow-600 bg-yellow-50 border-yellow-200" :
                           quota.level === "critical" ? "text-orange-600 bg-orange-50 border-orange-200" :
                           "text-red-600 bg-red-50 border-red-200";
            return (
              <div className={`rounded-lg border p-3 text-sm ${colors}`}>
                {warning}
              </div>
            );
          })()}
          <Button variant="outline" className="mt-2" onClick={handleCleanup}>清理存储空间</Button>
        </CardContent>
      </Card>

      {/* 自动备份 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="size-4" />自动备份</CardTitle>
          <CardDescription>配置自动备份策略</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-backup">启用自动备份</Label>
            <Switch id="auto-backup" checked={autoBackup} onCheckedChange={handleAutoBackupChange} />
          </div>
          <p className="text-sm text-muted-foreground">每日增量备份，每周完整备份</p>
          <div className="flex items-center gap-3 pt-2">
            <Button variant="outline" onClick={handleBackupNow}>立即备份</Button>
            <Button variant="link" onClick={loadBackups}>
              查看备份历史 ({backups.length})
            </Button>
          </div>
          {backups.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">最近备份</p>
              {backups.slice(0, 3).map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <span className="font-medium">{b.type === "full" ? "全量" : b.type === "incremental" ? "增量" : "手动"}</span>
                    <span className="ml-2 text-muted-foreground">{b.clipCount} 条记录</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleString("zh-CN")}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 自动清理 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="size-4" />自动清理</CardTitle>
          <CardDescription>配置自动清理过期内容策略</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-cleanup">启用自动清理</Label>
            <Switch id="auto-cleanup" checked={autoCleanup} onCheckedChange={setAutoCleanup} />
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="retention-days">内容保留天数</Label>
            <Input id="retention-days" type="number" value={retentionDays} onChange={(e) => setRetentionDays(e.target.value)} className="w-24" min={1} />
          </div>
          <p className="text-sm text-muted-foreground">已删除的内容将在回收站中保留 30 天后永久删除</p>
        </CardContent>
      </Card>

      {/* 错误代码管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="size-4" />错误代码管理</CardTitle>
          <CardDescription>管理错误提示信息，修改后实时生效</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Link href="/error-codes">
              <Button variant="outline">管理错误代码</Button>
            </Link>
            <Badge variant="secondary">26 个错误码</Badge>
          </div>
        </CardContent>
      </Card>

      {/* 危险操作 */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive"><Trash2 className="size-4" />危险操作</CardTitle>
          <CardDescription>以下操作不可撤销，请谨慎执行</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="destructive" onClick={handleClearAllData}>清空所有剪贴板数据</Button>
          <Button variant="destructive" onClick={handleExportAndDelete}>导出并删除账号</Button>
        </CardContent>
      </Card>
    </div>
  );
}
