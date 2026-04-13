# ClipSync - 跨设备剪贴板管理工具

> 基于 Next.js 14 + Supabase 的跨设备剪贴板同步工具，支持自动捕获剪贴板内容并云端同步。

## 功能特性

- **自动捕获**：实时监听剪贴板，复制即保存
- **多类型支持**：文本、图片、链接、文件、视频、音乐
- **云端同步**：基于 Supabase，多设备数据同步
- **智能搜索**：全文搜索 + 高级筛选（时间/设备）
- **批量操作**：多选、全选/取消全选、批量删除/收藏
- **收藏系统**：收藏夹独立管理
- **回收站**：软删除 + 7 天自动清理
- **导入导出**：JSON 导入 + ZIP 导出
- **数据看板**：总记录数、类型占比、存储用量
- **文件上传**：上传到 Supabase Storage，支持下载
- **设置中心**：配额预警、备份管理、清理过期内容

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端 | Next.js 14 (App Router) + TypeScript |
| 样式 | Tailwind CSS + shadcn/ui |
| 状态管理 | Zustand |
| 后端 | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| 富文本 | Tiptap |
| 打包 | JSZip |

## 快速开始

### 前置要求

- [Node.js](https://nodejs.org/) >= 18（推荐 LTS 版本）
- 一个 [Supabase](https://supabase.com/) 账号（免费即可）

### 第 1 步：创建 Supabase 项目

1. 打开 [supabase.com](https://supabase.com)，注册/登录
2. 点击 **"New Project"**，填写项目名称 `clipsync`，设置数据库密码
3. 等待项目创建完成（约 2 分钟）
4. 记下你的 **Project URL** 和 **anon key**（在 Settings → API 中）

### 第 2 步：执行数据库初始化 SQL

1. 在 Supabase 项目中，点击左侧 **SQL Editor**
2. 点击 **"New query"**
3. 将 `supabase-init.sql` 文件的内容粘贴进去
4. 点击 **Run**，等待执行完成

### 第 3 步：配置环境变量

1. 将 `.env.example` 文件复制一份，重命名为 `.env.local`
2. 填入你的 Supabase 配置：

```
NEXT_PUBLIC_SUPABASE_URL=https://你的项目ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon-key
```

### 第 4 步：安装依赖并启动

打开终端，进入项目目录，依次执行：

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 第 5 步：打开浏览器

访问 [http://localhost:3000](http://localhost:3000)，注册一个账号即可开始使用！

> 首次注册后，如果登录提示"邮箱未验证"，可以在 Supabase 后台手动通过：
> SQL Editor 中执行：`UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = '你的邮箱';`

## 关闭邮箱验证（可选）

默认开启邮箱验证。如需关闭：

1. Supabase → Authentication → Providers → Email
2. 关闭 **"Confirm email"** 开关
3. 点击 Save

## 项目结构

```
src/
├── app/
│   ├── (auth)/login/          # 登录页
│   ├── (auth)/register/       # 注册页
│   ├── (dashboard)/
│   │   ├── page.tsx           # 数据看板
│   │   ├── clips/page.tsx     # 剪贴板历史（主页）
│   │   ├── favorites/         # 收藏夹
│   │   ├── devices/           # 设备管理
│   │   ├── trash/             # 回收站
│   │   ├── import-export/     # 导入导出
│   │   ├── settings/          # 设置中心
│   │   └── error-codes/       # 错误代码管理
│   └── page.tsx               # 根页面（重定向到 /clips）
├── components/                # UI 组件
├── lib/                       # 工具库、Hooks、数据访问层
├── stores/                    # Zustand 状态管理
└── types/                     # TypeScript 类型定义
```

## 常见问题

**Q: npm install 报错怎么办？**
A: 确保安装了 Node.js 18+，在项目根目录（有 package.json 的目录）下执行。

**Q: 启动后页面空白？**
A: 检查 `.env.local` 中的 Supabase URL 和 Key 是否正确。

**Q: 上传文件报 RLS 错误？**
A: 确认已执行 `supabase-init.sql` 中的所有 SQL。

**Q: 注册后无法登录？**
A: 检查 Supabase → Authentication → Users 中该用户是否已确认邮箱，或关闭邮箱验证。

## License

MIT
