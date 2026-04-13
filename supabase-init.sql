-- ============================================================
-- ClipSync 数据库初始化脚本
-- 在 Supabase SQL Editor 中执行此脚本
-- ============================================================

-- 1. 创建 users 表（扩展 auth.users 的公开信息）
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  "displayName" TEXT,
  avatarUrl TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  "storageUsed" BIGINT NOT NULL DEFAULT 0,
  "storageLimit" BIGINT NOT NULL DEFAULT 104857600,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 创建 clips 表
CREATE TABLE IF NOT EXISTS public.clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'text',
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  "contentPreview" TEXT,
  fileUrl TEXT,
  "fileSize" BIGINT,
  mimeType TEXT,
  metadata JSONB DEFAULT '{}',
  "sourceDevice" TEXT DEFAULT 'Web',
  isFavorite BOOLEAN NOT NULL DEFAULT FALSE,
  isDeleted BOOLEAN NOT NULL DEFAULT FALSE,
  "deletedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 创建 devices 表
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'web',
  "userAgent" TEXT,
  "lastActiveAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("userId", name)
);

-- 4. 创建 backups 表
CREATE TABLE IF NOT EXISTS public.backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  "fileSize" BIGINT,
  type TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'completed',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. 创建 sync_logs 表
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. 创建索引
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clips_userId ON public.clips("userId");
CREATE INDEX IF NOT EXISTS idx_clips_type ON public.clips(type);
CREATE INDEX IF NOT EXISTS idx_clips_isDeleted ON public.clips("isDeleted");
CREATE INDEX IF NOT EXISTS idx_clips_createdAt ON public.clips("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_clips_userId_type ON public.clips("userId", type);
CREATE INDEX IF NOT EXISTS idx_devices_userId ON public.devices("userId");
CREATE INDEX IF NOT EXISTS idx_backups_userId ON public.backups("userId");
CREATE INDEX IF NOT EXISTS idx_sync_logs_userId ON public.sync_logs("userId");

-- ============================================================
-- 7. 启用 RLS（行级安全策略）
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. RLS 策略
-- ============================================================

-- users 表策略
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- clips 表策略
CREATE POLICY "Users can manage own clips" ON public.clips
  FOR ALL USING ("userId" = auth.uid()::text);

-- devices 表策略
CREATE POLICY "Users can manage own devices" ON public.devices
  FOR ALL USING ("userId" = auth.uid()::text);

-- backups 表策略
CREATE POLICY "Users can manage own backups" ON public.backups
  FOR ALL USING ("userId" = auth.uid()::text);

-- sync_logs 表策略
CREATE POLICY "Users can insert own logs" ON public.sync_logs
  FOR INSERT WITH CHECK ("userId" = auth.uid()::text);

CREATE POLICY "Users can view own logs" ON public.sync_logs
  FOR SELECT USING ("userId" = auth.uid()::text);

CREATE POLICY "Users can delete own logs" ON public.sync_logs
  FOR DELETE USING ("userId" = auth.uid()::text);

-- ============================================================
-- 9. 创建 Storage Bucket（clip-files）
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('clip-files', 'clip-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS 策略
CREATE POLICY "Allow authenticated upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'clip-files' AND auth.role() = 'authenticated');

CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'clip-files');

CREATE POLICY "Allow authenticated delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'clip-files' AND auth.role() = 'authenticated');

-- ============================================================
-- 10. 创建触发器：auth.users 新用户自动同步到 public.users
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, "displayName", avatarUrl, plan, "storageUsed", "storageLimit")
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
    'free',
    0,
    104857600
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 完成！
-- ============================================================
