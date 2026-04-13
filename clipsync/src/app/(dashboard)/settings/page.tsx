"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  User,
  HardDrive,
  Database,
  Shield,
  Clock,
  Trash2,
} from "lucide-react";

export default function SettingsPage() {
  const [autoBackup, setAutoBackup] = useState(true);
  const [autoCleanup, setAutoCleanup] = useState(false);
  const [retentionDays, setRetentionDays] = useState("90");

  const storageUsed = 256;
  const storageTotal = 1024;
  const storagePercent = Math.round((storageUsed / storageTotal) * 100);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">设置</h1>
        <p className="text-muted-foreground">管理你的账号、存储和偏好设置</p>
      </div>

      {/* 1. 账号信息 Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-4" />
            账号信息
          </CardTitle>
          <CardDescription>查看和管理你的账号基本信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">邮箱</p>
              <p className="font-medium">user@example.com</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">显示名称</p>
              <p className="font-medium">用户名</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">当前套餐</p>
              <Badge>免费版</Badge>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline">修改资料</Button>
            <Button variant="outline">修改密码</Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. 存储管理 Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="size-4" />
            存储管理
          </CardTitle>
          <CardDescription>查看和管理你的存储空间使用情况</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">已使用空间</span>
              <span className="font-medium">
                {storageUsed} MB / {storageTotal >= 1024 ? `${storageTotal / 1024} GB` : `${storageTotal} MB`}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${storagePercent}%` }}
              />
            </div>
          </div>
          <Button variant="outline" className="mt-2">
            清理存储空间
          </Button>
        </CardContent>
      </Card>

      {/* 3. 自动备份 Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="size-4" />
            自动备份
          </CardTitle>
          <CardDescription>配置自动备份策略</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-backup">启用自动备份</Label>
            <Switch
              id="auto-backup"
              checked={autoBackup}
              onCheckedChange={setAutoBackup}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            每日增量备份，每周完整备份
          </p>
          <div className="flex items-center gap-3 pt-2">
            <Button variant="outline">立即备份</Button>
            <Button variant="link">查看备份历史</Button>
          </div>
        </CardContent>
      </Card>

      {/* 4. 自动清理 Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-4" />
            自动清理
          </CardTitle>
          <CardDescription>配置自动清理过期内容策略</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-cleanup">启用自动清理</Label>
            <Switch
              id="auto-cleanup"
              checked={autoCleanup}
              onCheckedChange={setAutoCleanup}
            />
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="retention-days">内容保留天数</Label>
            <Input
              id="retention-days"
              type="number"
              value={retentionDays}
              onChange={(e) => setRetentionDays(e.target.value)}
              className="w-24"
              min={1}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            已删除的内容将在回收站中保留 30 天后永久删除
          </p>
        </CardContent>
      </Card>

      {/* 5. 错误代码管理 Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-4" />
            错误代码管理
          </CardTitle>
          <CardDescription>
            管理错误提示信息，修改后实时生效
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="outline">管理错误代码</Button>
            <Badge variant="secondary">26 个错误码</Badge>
          </div>
        </CardContent>
      </Card>

      {/* 6. 危险操作 Card */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="size-4" />
            危险操作
          </CardTitle>
          <CardDescription>
            以下操作不可撤销，请谨慎执行
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="destructive">清空所有数据</Button>
          <Button variant="destructive">导出并删除账号</Button>
        </CardContent>
      </Card>
    </div>
  );
}
