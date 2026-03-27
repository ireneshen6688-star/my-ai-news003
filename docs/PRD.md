# My AI News - 产品需求文档 (PRD)

> **版本**：v1.0  
> **日期**：2026-03-27  
> **状态**：待评审  
> **产品经理**：AI Assistant  
> **目标上线时间**：2026-04-27（4周）

---

## 📋 文档修订历史

| 版本 | 日期 | 修订人 | 修订内容 |
|-----|------|--------|---------|
| v1.0 | 2026-03-27 | AI Assistant | 初始版本 |

---

## 一、产品概述

### 1.1 产品背景

**问题现状：**
- 用户每天面对海量信息，难以筛选出真正关心的内容
- 传统新闻 App 推送内容泛化，不够精准
- Google Alerts 等工具功能简陋，无 AI 摘要能力
- 用户需要主动打开多个网站/App 才能获取信息

**解决方案：**
My AI News 通过用户自定义关键词 + AI 智能摘要 + 定时邮件推送，让用户被动接收精准的个性化新闻。

### 1.2 产品定位

**一句话描述：** 让 AI 成为你的私人新闻编辑，每天为你精选最相关的资讯。

**产品类型：** SaaS 工具型网站

**目标市场：** 全球英文用户（MVP），后续扩展中文市场

### 1.3 目标用户画像

#### 用户 A：科技从业者 Alex
- **年龄**：28-35岁
- **职业**：软件工程师 / 产品经理
- **痛点**：需要追踪 AI、Web3 等行业动态，但信息源分散
- **使用场景**：每天早上 8 点收到"AI"、"ChatGPT"、"LLM"相关新闻
- **期望**：5 分钟内快速了解行业最新动态

#### 用户 B：投资者 Sarah
- **年龄**：30-45岁
- **职业**：个人投资者 / 基金经理
- **痛点**：需要关注特定公司和行业新闻，但无法 24 小时盯盘
- **使用场景**：每周一收到"Tesla"、"Bitcoin"、"NVIDIA"新闻汇总
- **期望**：及时获取影响投资决策的关键信息

#### 用户 C：内容创作者 Mike
- **年龄**：25-35岁
- **职业**：博主 / 自媒体
- **痛点**：需要持续的内容灵感和素材来源
- **使用场景**：每天收到热点话题和趋势新闻
- **期望**：快速找到值得创作的话题

---

## 二、核心功能需求

### 2.1 功能架构图

```
My AI News
├── 用户认证模块
│   └── Google OAuth 登录
├── 订阅管理模块
│   ├── 创建订阅
│   ├── 任务列表
│   └── 开关控制
├── 新闻生成模块
│   ├── 新闻抓取
│   ├── AI 摘要
│   └── 内容过滤
├── 推送模块
│   ├── 定时任务
│   └── 邮件发送
└── 设置模块
    ├── 语言切换
    └── 邮箱修改
```

### 2.2 功能优先级

| 优先级 | 功能模块 | 功能点 | 开发周期 | 依赖 |
|-------|---------|--------|---------|------|
| P0 | 用户认证 | Google OAuth 登录 | 2天 | NextAuth.js |
| P0 | 订阅管理 | 创建订阅任务 | 3天 | 数据库 |
| P0 | 订阅管理 | 任务列表展示 | 2天 | - |
| P0 | 订阅管理 | 任务开关控制 | 1天 | - |
| P0 | 新闻生成 | 新闻 API 集成 | 2天 | NewsAPI |
| P0 | 新闻生成 | AI 摘要生成 | 3天 | OpenAI API |
| P0 | 推送模块 | 定时任务调度 | 2天 | Vercel Cron |
| P0 | 推送模块 | 邮件发送 | 2天 | Resend |
| P1 | 设置模块 | 多语言切换 | 2天 | i18n |
| P1 | 设置模块 | 邮箱修改 | 1天 | - |
| P2 | 订阅管理 | 任务编辑 | 2天 | - |
| P2 | 订阅管理 | 任务删除 | 1天 | - |

**MVP 范围：** P0 功能（预计 3 周）

---

## 三、详细用户流程

### 3.1 用户注册/登录流程

**流程图：**
```
用户访问首页 
    ↓
点击 "Sign in with Google"
    ↓
跳转 Google OAuth 授权页
    ↓
用户授权（允许访问邮箱信息）
    ↓
返回网站，系统自动创建/登录账户
    ↓
跳转到仪表盘页面
```

**页面交互细节：**

**首页（未登录状态）**
- URL: `/`
- 页面元素：
  - Logo + 产品名称（左上角）
  - 语言切换按钮（右上角）：EN / 中文
  - 主标题："Your Personal AI News Editor"
  - 副标题："Get personalized news summaries delivered to your inbox"
  - CTA 按钮："Sign in with Google"（居中，大按钮）
  - 产品特点（3 个图标 + 文字）：
    - ✓ Custom Keywords
    - ✓ AI-Powered Summaries
    - ✓ Scheduled Delivery
  - Footer：Privacy Policy | Terms of Service

**交互行为：**
1. 用户点击 "Sign in with Google"
2. 触发 NextAuth.js 的 `signIn('google')` 方法
3. 跳转到 Google OAuth 页面
4. 用户授权后，回调到 `/api/auth/callback/google`
5. 系统检查数据库：
   - 如果用户不存在 → 创建新用户记录
   - 如果用户已存在 → 更新 last_login 时间
6. 设置 session cookie
7. 重定向到 `/dashboard`

**数据库操作：**
```sql
-- 创建用户
INSERT INTO users (id, email, name, avatar_url, language, created_at)
VALUES (uuid_generate_v4(), 'user@gmail.com', 'John Doe', 'https://...', 'en', NOW());
```

**错误处理：**
- Google 授权失败 → 显示错误提示："Failed to sign in. Please try again."
- 网络错误 → 显示："Network error. Please check your connection."

---

### 3.2 创建订阅任务流程

**流程图：**
```
用户进入仪表盘
    ↓
点击 "+ Create Subscription" 按钮
    ↓
打开创建订阅表单（Modal 或新页面）
    ↓
填写表单字段
    ↓
点击 "Create" 按钮
    ↓
前端验证 → 后端保存 → 返回任务列表
```

**页面交互细节：**

**仪表盘页面（已登录）**
- URL: `/dashboard`
- 页面布局：
  ```
  [Header]
  Logo | My Subscriptions | Settings | [User Avatar ▼]
  
  [Main Content]
  My Subscriptions                    [+ Create Subscription]
  
  [任务列表区域]
  - 如果有任务 → 显示任务卡片
  - 如果无任务 → 显示空状态
  ```

**创建订阅表单（Modal）**
- 触发方式：点击 "+ Create Subscription" 按钮
- 表单字段：

| 字段名 | 类型 | 必填 | 默认值 | 验证规则 | 提示文案 |
|-------|------|------|--------|---------|---------|
| Keywords | Text Input | 是 | - | 不能为空，最多 200 字符 | "Enter keywords (comma separated)" |
| Frequency | Radio | 是 | Daily | Daily/Weekly/Monthly | "How often?" |
| Time | Time Picker | 是 | 08:00 | 24小时制 | "What time?" |
| Email | Email Input | 是 | 登录邮箱 | 邮箱格式验证 | "Delivery email" |

**表单示例：**
```
Create New Subscription
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Keywords *
[AI, ChatGPT, Machine Learning          ]
Enter keywords separated by commas

Frequency *
○ Daily   ○ Weekly   ○ Monthly

Delivery Time *
[08:00 ▼]

Email Address *
[user@gmail.com                         ]

[Cancel]  [Create Subscription]
```

**前端验证逻辑：**
```javascript
// 关键词验证
if (!keywords.trim()) {
  error = "Keywords cannot be empty"
}

// 邮箱验证
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  error = "Invalid email format"
}
```

**API 调用：**
```
POST /api/subscriptions
Content-Type: application/json

{
  "keywords": ["AI", "ChatGPT", "Machine Learning"],
  "frequency": "daily",
  "schedule_time": "08:00",
  "target_email": "user@gmail.com"
}
```

**后端处理：**
```sql
INSERT INTO subscriptions (
  id, user_id, keywords, frequency, 
  schedule_time, target_email, is_active, created_at
) VALUES (
  uuid_generate_v4(), 
  'user-uuid', 
  ARRAY['AI', 'ChatGPT', 'Machine Learning'],
  'daily',
  '08:00:00',
  'user@gmail.com',
  true,
  NOW()
);
```

**成功响应：**
- 关闭 Modal
- 刷新任务列表
- 显示成功提示："Subscription created successfully!"
- 新任务出现在列表顶部

**错误处理：**
- 数据库错误 → "Failed to create subscription. Please try again."
- 网络超时 → "Request timeout. Please check your connection."

---

### 3.3 任务管理流程

**任务列表展示**

**任务卡片设计：**
```
┌─────────────────────────────────────────────────┐
│ AI, ChatGPT, Machine Learning          [Toggle] │
│ Daily at 08:00 | user@gmail.com                 │
│ Created: 2026-03-27                             │
└─────────────────────────────────────────────────┘
```

**卡片元素：**
- 关键词列表（粗体显示）
- 推送频率 + 时间
- 接收邮箱
- 创建时间
- 开关按钮（右上角）

**开关状态：**
- 开启状态：Toggle 为绿色，任务正常推送
- 关闭状态：Toggle 为灰色，任务暂停推送，卡片半透明

**交互行为：**

1. **点击开关按钮**
   - 触发 API: `PATCH /api/subscriptions/:id`
   - 请求体: `{ "is_active": false }`
   - 成功后：
     - 更新 UI 状态
     - 显示提示："Subscription paused" 或 "Subscription activated"

2. **空状态展示**
   - 当用户没有任务时显示：
   ```
   [图标]
   No subscriptions yet
   Create your first subscription to get started
   
   [+ Create Subscription]
   ```

**API 接口：**
```
GET /api/subscriptions
→ 返回当前用户的所有订阅任务

PATCH /api/subscriptions/:id
→ 更新任务状态（开启/关闭）
```

---

### 3.4 新闻生成与推送流程

**定时任务触发流程：**
```
Cron 触发（每小时检查一次）
    ↓
查询需要推送的任务（根据时间和频率）
    ↓
遍历每个任务
    ↓
调用新闻 API 搜索关键词
    ↓
调用 AI 生成摘要
    ↓
格式化邮件内容
    ↓
发送邮件
    ↓
记录推送日志
```

**技术实现细节：**

**1. Cron 配置（Vercel）**
```javascript
// vercel.json
{
  "crons": [{
    "path": "/api/cron/send-news",
    "schedule": "0 * * * *"  // 每小时执行
  }]
}
```

**2. 任务查询逻辑**
```javascript
// 查询需要推送的任务
const now = new Date();
const currentHour = now.getHours();

const tasks = await db.subscriptions.findMany({
  where: {
    is_active: true,
    schedule_time: `${currentHour}:00:00`,
    // 根据频率过滤
    OR: [
      { frequency: 'daily' },
      { frequency: 'weekly', AND: { /* 检查是否周一 */ } },
      { frequency: 'monthly', AND: { /* 检查是否1号 */ } }
    ]
  }
});
```

**3. 新闻抓取**
```javascript
// 调用 NewsAPI
const response = await fetch(
  `https://newsapi.org/v2/everything?q=${keywords.join(' OR ')}&sortBy=publishedAt&pageSize=10`,
  { headers: { 'X-Api-Key': process.env.NEWS_API_KEY } }
);
```

**4. AI 摘要生成**
```javascript
// 调用 OpenAI
const summary = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{
    role: "system",
    content: "Summarize the following news in 100-150 words."
  }, {
    role: "user",
    content: newsContent
  }]
});
```

**5. 邮件模板**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .news-item { margin-bottom: 20px; padding: 15px; border-left: 3px solid #4A90E2; }
  </style>
</head>
<body>
  <h2>Your AI News Digest: {{keywords}}</h2>
  <p>Here are the latest news for {{date}}</p>
  
  {{#each news}}
  <div class="news-item">
    <h3>{{title}}</h3>
    <p><small>{{source}} | {{publishedAt}}</small></p>
    <p>{{summary}}</p>
    <a href="{{url}}">Read more →</a>
  </div>
  {{/each}}
  
  <hr>
  <p><a href="{{manageUrl}}">Manage subscriptions</a></p>
</body>
</html>
```

**6. 发送邮件**
```javascript
await resend.emails.send({
  from: 'My AI News <news@myainews.com>',
  to: task.target_email,
  subject: `[My AI News] ${keywords.join(', ')} - ${date}`,
  html: emailHtml
});
```


---

## 四、技术架构设计

### 4.1 系统架构图

```
┌─────────────┐
│   用户浏览器  │
└──────┬──────┘
       │ HTTPS
       ↓
┌─────────────────────────────────┐
│   Vercel (Next.js)              │
│  ┌──────────┐  ┌──────────┐    │
│  │  前端页面  │  │ API Routes│    │
│  └──────────┘  └─────┬────┘    │
└────────────────────┬─┴──────────┘
                     │
        ┌────────────┼────────────┐
        ↓            ↓            ↓
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Supabase │  │ OpenAI   │  │ NewsAPI  │
│ (数据库)  │  │ (AI摘要) │  │ (新闻源) │
└──────────┘  └──────────┘  └──────────┘
        ↓
┌──────────┐
│  Resend  │
│ (邮件)   │
└──────────┘
```

### 4.2 技术栈选型

| 层级 | 技术 | 版本 | 选型理由 |
|-----|------|------|---------|
| 前端框架 | Next.js | 14.x | SSR支持，API Routes，零配置 |
| 语言 | TypeScript | 5.x | 类型安全，减少bug |
| 样式 | Tailwind CSS | 3.x | 快速开发，清雅风格易实现 |
| 认证 | NextAuth.js | 5.x | Google OAuth 集成简单 |
| 数据库 | PostgreSQL | 15.x | 关系型，Supabase托管 |
| ORM | Prisma | 5.x | 类型安全，迁移方便 |
| 定时任务 | Vercel Cron | - | 原生支持 |
| 邮件服务 | Resend | - | 免费3000封/月 |
| AI服务 | OpenAI API | GPT-4 | 摘要质量高 |
| 新闻API | NewsAPI | - | 免费100次/天 |
| 部署 | Vercel | - | 零配置，自动CI/CD |


### 4.3 数据库设计

**ER 图：**
```
users (用户表)
├── id (UUID, PK)
├── email (String, Unique)
├── name (String)
├── avatar_url (String)
├── language (String, default: 'en')
├── created_at (Timestamp)
└── updated_at (Timestamp)

subscriptions (订阅表)
├── id (UUID, PK)
├── user_id (UUID, FK → users.id)
├── keywords (String[])
├── frequency (Enum: daily/weekly/monthly)
├── schedule_time (Time)
├── target_email (String)
├── is_active (Boolean, default: true)
├── created_at (Timestamp)
└── updated_at (Timestamp)
```

**Prisma Schema：**
```prisma
model User {
  id           String         @id @default(uuid())
  email        String         @unique
  name         String?
  avatarUrl    String?        @map("avatar_url")
  language     String         @default("en")
  createdAt    DateTime       @default(now()) @map("created_at")
  updatedAt    DateTime       @updatedAt @map("updated_at")
  subscriptions Subscription[]

  @@map("users")
}

model Subscription {
  id           String   @id @default(uuid())
  userId       String   @map("user_id")
  keywords     String[]
  frequency    Frequency
  scheduleTime String   @map("schedule_time")
  targetEmail  String   @map("target_email")
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("subscriptions")
}

enum Frequency {
  daily
  weekly
  monthly
}
```


### 4.4 API 接口设计

**认证相关**

```
GET /api/auth/session
→ 获取当前用户 session

POST /api/auth/signin
→ 触发 Google OAuth 登录

POST /api/auth/signout
→ 退出登录
```

**订阅管理**

```
GET /api/subscriptions
→ 获取当前用户的所有订阅
Response: {
  subscriptions: [
    {
      id: "uuid",
      keywords: ["AI", "ChatGPT"],
      frequency: "daily",
      scheduleTime: "08:00",
      targetEmail: "user@gmail.com",
      isActive: true,
      createdAt: "2026-03-27T00:00:00Z"
    }
  ]
}

POST /api/subscriptions
→ 创建新订阅
Request: {
  keywords: ["AI", "ChatGPT"],
  frequency: "daily",
  scheduleTime: "08:00",
  targetEmail: "user@gmail.com"
}
Response: {
  success: true,
  subscription: { ... }
}

PATCH /api/subscriptions/:id
→ 更新订阅状态
Request: {
  isActive: false
}
Response: {
  success: true
}
```

**定时任务**

```
POST /api/cron/send-news
→ Vercel Cron 触发，发送新闻邮件
（需要验证 Cron Secret）
```


---

## 五、UI/UX 设计规范

### 5.1 设计原则

- **简洁**：每个页面只展示必要信息
- **清雅**：使用柔和的色彩，充足的留白
- **直观**：用户无需学习即可使用
- **响应式**：适配桌面和移动端

### 5.2 色彩系统

| 用途 | 颜色名 | Hex | 使用场景 |
|-----|--------|-----|---------|
| 主色 | Sky Blue | #4A90E2 | 按钮、链接、强调 |
| 背景 | Light Blue | #E8F4F8 | 页面背景、卡片背景 |
| 文字主色 | Dark Gray | #333333 | 标题、正文 |
| 文字辅色 | Medium Gray | #666666 | 次要信息 |
| 边框 | Light Gray | #E0E0E0 | 分割线、输入框 |
| 成功 | Green | #10B981 | 成功提示、开启状态 |
| 错误 | Red | #EF4444 | 错误提示 |
| 白色 | White | #FFFFFF | 卡片、Modal |

### 5.3 字体规范

- **英文字体**：Inter, -apple-system, sans-serif
- **中文字体**：PingFang SC, Microsoft YaHei, sans-serif
- **字号**：
  - H1: 32px (页面标题)
  - H2: 24px (区块标题)
  - Body: 16px (正文)
  - Small: 14px (辅助信息)

### 5.4 间距规范

- 页面边距：24px
- 卡片间距：16px
- 元素内边距：12px
- 按钮高度：40px
- 输入框高度：40px


### 5.5 页面原型

**首页（未登录）**
```
┌────────────────────────────────────────────┐
│ [Logo] My AI News          [EN/中文] [Sign in] │
├────────────────────────────────────────────┤
│                                            │
│         Your Personal AI News Editor       │
│    Get personalized news summaries         │
│         delivered to your inbox            │
│                                            │
│        [Sign in with Google]               │
│                                            │
│   ✓ Custom Keywords  ✓ AI Summaries       │
│   ✓ Scheduled Delivery                    │
│                                            │
└────────────────────────────────────────────┘
```

**仪表盘（已登录）**
```
┌────────────────────────────────────────────┐
│ [Logo]  My Subscriptions  Settings  [👤▼]  │
├────────────────────────────────────────────┤
│ My Subscriptions          [+ Create]       │
│                                            │
│ ┌────────────────────────────────────┐    │
│ │ AI, ChatGPT              [Toggle ON]│    │
│ │ Daily at 08:00                      │    │
│ │ user@gmail.com                      │    │
│ └────────────────────────────────────┘    │
│                                            │
│ ┌────────────────────────────────────┐    │
│ │ Tesla, Bitcoin          [Toggle OFF]│    │
│ │ Weekly at 09:00                     │    │
│ │ user@gmail.com                      │    │
│ └────────────────────────────────────┘    │
└────────────────────────────────────────────┘
```


---

## 六、开发计划

### 6.1 开发里程碑

| 周次 | 阶段 | 任务 | 交付物 |
|-----|------|------|--------|
| Week 1 | 环境搭建 | 项目初始化、数据库设计、认证集成 | 可登录的骨架 |
| Week 2 | 核心功能 | 订阅创建、任务列表、开关控制 | 完整的订阅管理 |
| Week 3 | 后端逻辑 | 新闻抓取、AI摘要、邮件推送 | 定时推送功能 |
| Week 4 | 优化上线 | 多语言、测试、部署 | 上线版本 |

### 6.2 Week 1 详细任务

**Day 1-2: 项目初始化**
- [ ] 创建 Next.js 项目
- [ ] 配置 TypeScript + Tailwind
- [ ] 配置 ESLint + Prettier
- [ ] 初始化 Git 仓库
- [ ] 部署到 Vercel（测试环境）

**Day 3-4: 数据库设计**
- [ ] 注册 Supabase 账号
- [ ] 设计数据库表结构
- [ ] 配置 Prisma
- [ ] 编写数据库迁移
- [ ] 测试数据库连接

**Day 5-7: 用户认证**
- [ ] 集成 NextAuth.js
- [ ] 配置 Google OAuth
- [ ] 实现登录页面
- [ ] 实现 session 管理
- [ ] 测试登录流程


### 6.3 Week 2 详细任务

**Day 1-3: 订阅创建**
- [ ] 设计创建订阅表单
- [ ] 实现表单验证
- [ ] 编写 POST /api/subscriptions API
- [ ] 测试创建流程

**Day 4-5: 任务列表**
- [ ] 设计任务卡片组件
- [ ] 实现 GET /api/subscriptions API
- [ ] 实现列表渲染
- [ ] 实现空状态

**Day 6-7: 开关控制**
- [ ] 实现 Toggle 组件
- [ ] 编写 PATCH /api/subscriptions/:id API
- [ ] 实现状态更新
- [ ] 测试开关功能


### 6.4 Week 3 详细任务

**Day 1-2: 新闻抓取**
- [ ] 注册 NewsAPI 账号
- [ ] 实现新闻搜索函数
- [ ] 测试 API 调用
- [ ] 处理错误和限流

**Day 3-4: AI 摘要**
- [ ] 注册 OpenAI 账号
- [ ] 编写摘要生成函数
- [ ] 优化 prompt
- [ ] 测试摘要质量

**Day 5-7: 邮件推送**
- [ ] 注册 Resend 账号
- [ ] 设计邮件模板
- [ ] 配置 Vercel Cron
- [ ] 实现定时任务逻辑
- [ ] 测试邮件发送

### 6.5 Week 4 详细任务

**Day 1-2: 多语言**
- [ ] 配置 i18n
- [ ] 翻译所有文案
- [ ] 实现语言切换
- [ ] 测试中英文

**Day 3-5: 测试**
- [ ] 功能测试
- [ ] 边界测试
- [ ] 性能测试
- [ ] Bug 修复

**Day 6-7: 部署上线**
- [ ] 配置生产环境变量
- [ ] 部署到 Vercel
- [ ] 绑定域名
- [ ] 上线验证


---

## 七、风险评估与应对

### 7.1 技术风险

| 风险 | 概率 | 影响 | 应对方案 |
|-----|------|------|---------|
| NewsAPI 限流 | 高 | 高 | 备用多个新闻源API |
| OpenAI 成本超支 | 中 | 中 | 限制摘要长度，优化prompt |
| 邮件进垃圾箱 | 中 | 高 | 配置SPF/DKIM，使用可靠服务 |
| Vercel Cron 不稳定 | 低 | 高 | 添加重试机制和监控 |
| 数据库性能 | 低 | 中 | 添加索引，优化查询 |

### 7.2 产品风险

| 风险 | 概率 | 影响 | 应对方案 |
|-----|------|------|---------|
| 用户留存率低 | 中 | 高 | 优化新闻质量，增加推荐 |
| 关键词匹配不准 | 中 | 中 | 优化搜索算法，支持反馈 |
| 竞品压力 | 高 | 中 | 强化AI摘要差异化 |


---

## 八、成功指标

### 8.1 核心指标（MVP阶段）

| 指标 | 目标值 | 衡量方式 | 数据来源 |
|-----|--------|---------|---------|
| 注册用户数 | 100+ | 累计注册 | 数据库统计 |
| 活跃订阅任务数 | 200+ | 开启状态任务 | 数据库统计 |
| 邮件打开率 | >20% | 打开/发送 | Resend统计 |
| 7天留存率 | >40% | 7天后登录 | 用户行为分析 |
| 平均订阅数/用户 | 2+ | 任务数/用户数 | 数据库统计 |

### 8.2 用户体验指标

| 指标 | 目标值 | 衡量方式 |
|-----|--------|---------|
| 首次创建订阅时间 | <2分钟 | 用户测试 |
| 页面加载速度 | <2秒 | Lighthouse |
| 邮件推送准时率 | >95% | 日志监控 |


---

## 九、环境变量配置

### 9.1 必需的环境变量

```bash
# 数据库
DATABASE_URL="postgresql://..."

# 认证
NEXTAUTH_URL="https://myainews.com"
NEXTAUTH_SECRET="random-secret-key"
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="xxx"

# 新闻API
NEWS_API_KEY="your-newsapi-key"

# AI
OPENAI_API_KEY="sk-xxx"

# 邮件
RESEND_API_KEY="re_xxx"

# Cron验证
CRON_SECRET="random-secret"
```


---

## 十、附录

### 10.1 竞品分析

| 产品 | 优势 | 劣势 | 差异化 |
|-----|------|------|--------|
| Google Alerts | 免费，覆盖广 | 无AI摘要，格式简陋 | 我们有AI摘要 |
| Feedly | 功能强大 | 学习成本高，付费 | 我们更简单 |
| Inoreader | 自定义丰富 | 界面复杂 | 我们更直观 |

### 10.2 未来规划（V2.0）

- 任务编辑和删除功能
- 推送历史记录查看
- 新闻收藏功能
- 多邮箱支持
- 微信/Telegram推送
- 付费高级功能

### 10.3 待决策事项

- [ ] 确定域名
- [ ] 确定品牌Logo
- [ ] 是否需要隐私政策页面
- [ ] 是否需要用户反馈功能

---

**文档结束**

_本PRD将根据开发进度持续更新_

