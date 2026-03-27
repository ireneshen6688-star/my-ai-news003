# My AI News - 技术架构方案（Cloudflare版）

> 基于 Cloudflare 全栈部署方案

---

## 一、技术架构

### 1.1 整体架构图

```
┌─────────────┐
│   用户浏览器  │
└──────┬──────┘
       │ HTTPS
       ↓
┌──────────────────────────────────────┐
│   Cloudflare Pages (前端)             │
│   - Next.js 静态导出                  │
│   - 全球 CDN 加速                     │
└──────────────┬───────────────────────┘
               │
               ↓
┌──────────────────────────────────────┐
│   Cloudflare Workers (后端API)        │
│   - 用户认证                          │
│   - 订阅管理                          │
│   - 新闻生成                          │
└──────┬───────┬───────┬───────────────┘
       │       │       │
       ↓       ↓       ↓
┌──────┐ ┌──────┐ ┌──────────┐
│  D1  │ │  KV  │ │ Cron     │
│(数据库)│ │(缓存)│ │(定时任务)│
└──────┘ └──────┘ └──────────┘
       │
       ↓
┌──────────────────────────────────────┐
│   外部服务                            │
│   - OpenAI (AI摘要)                  │
│   - NewsAPI (新闻源)                 │
│   - Resend (邮件)                    │
└──────────────────────────────────────┘
```

### 1.2 为什么选择 Cloudflare？

**优势：**
- ✅ 全球边缘网络，访问速度快
- ✅ 免费额度慷慨（Workers 10万次/天，D1 免费）
- ✅ 一站式解决方案（前端+后端+数据库+定时任务）
- ✅ 零冷启动，响应速度快
- ✅ 自动 HTTPS 和 DDoS 防护

**劣势：**
- ⚠️ Workers 有 CPU 时间限制（10ms免费，50ms付费）
- ⚠️ D1 数据库功能相对简单
- ⚠️ 调试相对复杂

---

## 二、技术栈选型

### 2.1 前端

| 技术 | 版本 | 用途 |
|-----|------|------|
| Next.js | 14.x | 前端框架（静态导出模式） |
| TypeScript | 5.x | 类型安全 |
| Tailwind CSS | 3.x | 样式 |
| React Hook Form | 7.x | 表单处理 |

**部署方式：**
```bash
# 构建静态站点
npm run build
npm run export

# 部署到 Cloudflare Pages
wrangler pages deploy out/
```


### 2.2 后端（Cloudflare Workers）

| 技术 | 版本 | 用途 |
|-----|------|------|
| Hono | 4.x | 轻量级 Web 框架 |
| TypeScript | 5.x | 类型安全 |
| Zod | 3.x | 数据验证 |
| Drizzle ORM | 0.29.x | D1 数据库 ORM |

**Workers 结构：**
```
workers/
├── src/
│   ├── index.ts          # 主入口
│   ├── routes/
│   │   ├── auth.ts       # 认证路由
│   │   ├── subscriptions.ts  # 订阅管理
│   │   └── cron.ts       # 定时任务
│   ├── db/
│   │   ├── schema.ts     # 数据库表定义
│   │   └── client.ts     # D1 客户端
│   ├── services/
│   │   ├── news.ts       # 新闻抓取
│   │   ├── ai.ts         # AI 摘要
│   │   └── email.ts      # 邮件发送
│   └── utils/
│       └── auth.ts       # JWT 验证
└── wrangler.toml         # Cloudflare 配置
```


### 2.3 数据库（Cloudflare D1）

**D1 Schema（使用 Drizzle ORM）：**

```typescript
// db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  language: text('language').default('en'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
});

export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  keywords: text('keywords').notNull(), // JSON string
  frequency: text('frequency').notNull(), // 'daily' | 'weekly' | 'monthly'
  scheduleTime: text('schedule_time').notNull(),
  targetEmail: text('target_email').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }),
});
```

**创建数据库：**
```bash
# 创建 D1 数据库
wrangler d1 create my-ai-news-db

# 执行迁移
wrangler d1 execute my-ai-news-db --file=./migrations/0001_init.sql
```


---

## 三、核心功能实现

### 3.1 用户认证（Google OAuth）

**流程：**
```
1. 前端跳转到 /api/auth/google
2. Workers 重定向到 Google OAuth
3. 用户授权后回调到 /api/auth/callback
4. Workers 验证 code，获取用户信息
5. 生成 JWT token，返回给前端
6. 前端存储 token 到 localStorage
```

**Workers 实现：**
```typescript
// routes/auth.ts
import { Hono } from 'hono';

const auth = new Hono();

auth.get('/google', async (c) => {
  const redirectUri = `${c.env.APP_URL}/api/auth/callback`;
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${c.env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${redirectUri}&` +
    `response_type=code&` +
    `scope=email profile`;
  
  return c.redirect(googleAuthUrl);
});

auth.get('/callback', async (c) => {
  const code = c.req.query('code');
  
  // 交换 access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: JSON.stringify({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${c.env.APP_URL}/api/auth/callback`,
      grant_type: 'authorization_code',
    }),
  });
  
  const { access_token } = await tokenRes.json();
  
  // 获取用户信息
  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  
  const user = await userRes.json();
  
  // 保存到数据库
  await saveUser(c.env.DB, user);
  
  // 生成 JWT
  const token = await generateJWT(user.id, c.env.JWT_SECRET);
  
  return c.redirect(`${c.env.APP_URL}/dashboard?token=${token}`);
});

export default auth;
```


### 3.2 订阅管理 API

**创建订阅：**
```typescript
// routes/subscriptions.ts
app.post('/api/subscriptions', async (c) => {
  const user = await verifyToken(c);
  const body = await c.req.json();
  
  const subscription = {
    id: crypto.randomUUID(),
    userId: user.id,
    keywords: JSON.stringify(body.keywords),
    frequency: body.frequency,
    scheduleTime: body.scheduleTime,
    targetEmail: body.targetEmail,
    isActive: true,
    createdAt: Date.now(),
  };
  
  await c.env.DB.prepare(
    'INSERT INTO subscriptions VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(...Object.values(subscription)).run();
  
  return c.json({ success: true, subscription });
});
```

**获取订阅列表：**
```typescript
app.get('/api/subscriptions', async (c) => {
  const user = await verifyToken(c);
  
  const result = await c.env.DB.prepare(
    'SELECT * FROM subscriptions WHERE user_id = ?'
  ).bind(user.id).all();
  
  return c.json({ subscriptions: result.results });
});
```


### 3.3 定时任务（Cron Triggers）

**wrangler.toml 配置：**
```toml
[triggers]
crons = ["0 * * * *"]  # 每小时执行
```

**Cron 处理逻辑：**
```typescript
// routes/cron.ts
export default {
  async scheduled(event, env, ctx) {
    const now = new Date();
    const currentHour = now.getHours();
    
    // 查询需要推送的任务
    const tasks = await env.DB.prepare(`
      SELECT * FROM subscriptions 
      WHERE is_active = 1 
      AND schedule_time LIKE ?
    `).bind(`${currentHour}:%`).all();
    
    // 处理每个任务
    for (const task of tasks.results) {
      await processTask(task, env);
    }
  }
};

async function processTask(task, env) {
  const keywords = JSON.parse(task.keywords);
  
  // 1. 抓取新闻
  const news = await fetchNews(keywords, env.NEWS_API_KEY);
  
  // 2. AI 摘要
  const summaries = await generateSummaries(news, env.OPENAI_API_KEY);
  
  // 3. 发送邮件
  await sendEmail(task.targetEmail, keywords, summaries, env.RESEND_API_KEY);
}
```


### 3.4 新闻抓取

```typescript
// services/news.ts
async function fetchNews(keywords: string[], apiKey: string) {
  const query = keywords.join(' OR ');
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=10`;
  
  const response = await fetch(url, {
    headers: { 'X-Api-Key': apiKey }
  });
  
  const data = await response.json();
  return data.articles;
}
```

### 3.5 AI 摘要生成

```typescript
// services/ai.ts
async function generateSummaries(articles: any[], apiKey: string) {
  const summaries = [];
  
  for (const article of articles) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: 'Summarize this news in 100-150 words.'
        }, {
          role: 'user',
          content: article.content
        }],
        max_tokens: 200,
      }),
    });
    
    const data = await response.json();
    summaries.push({
      ...article,
      summary: data.choices[0].message.content
    });
  }
  
  return summaries;
}
```


### 3.6 邮件发送

```typescript
// services/email.ts
async function sendEmail(to: string, keywords: string[], news: any[], apiKey: string) {
  const html = generateEmailHTML(keywords, news);
  
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'My AI News <news@myainews.com>',
      to,
      subject: `[My AI News] ${keywords.join(', ')}`,
      html,
    }),
  });
}
```

---

## 四、部署配置

### 4.1 wrangler.toml

```toml
name = "my-ai-news"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[triggers]
crons = ["0 * * * *"]

[[d1_databases]]
binding = "DB"
database_name = "my-ai-news-db"
database_id = "xxx"

[vars]
APP_URL = "https://myainews.com"

[[kv_namespaces]]
binding = "CACHE"
id = "xxx"
```


### 4.2 部署步骤

**1. 安装 Wrangler**
```bash
npm install -g wrangler
wrangler login
```

**2. 创建 D1 数据库**
```bash
wrangler d1 create my-ai-news-db
```

**3. 创建 KV 命名空间**
```bash
wrangler kv:namespace create CACHE
```

**4. 配置环境变量**
```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put JWT_SECRET
wrangler secret put NEWS_API_KEY
wrangler secret put OPENAI_API_KEY
wrangler secret put RESEND_API_KEY
```

**5. 部署 Workers**
```bash
cd workers
wrangler deploy
```

**6. 部署前端**
```bash
cd frontend
npm run build
wrangler pages deploy out/
```


---

## 五、成本估算

### 5.1 Cloudflare 成本

| 服务 | 免费额度 | 预估用量/月 | 成本 |
|-----|---------|------------|------|
| Workers | 10万次请求/天 | 5万次/天 | $0 |
| D1 数据库 | 500万行读 | 10万行 | $0 |
| Pages | 无限 | - | $0 |
| KV | 10万次读 | 1万次 | $0 |

### 5.2 外部服务成本

| 服务 | 免费额度 | 预估用量/月 | 成本 |
|-----|---------|------------|------|
| OpenAI | - | 1000次调用 | ~$10 |
| NewsAPI | 100次/天 | 3000次/月 | $0 |
| Resend | 3000封/月 | 1000封 | $0 |

**总成本：~$10/月**


---

## 六、技术方案对比

### 6.1 Cloudflare vs Vercel

| 维度 | Cloudflare | Vercel |
|-----|-----------|--------|
| 部署难度 | 中等 | 简单 |
| 全球速度 | 极快（边缘网络） | 快 |
| 免费额度 | 慷慨 | 有限 |
| 数据库 | D1（SQLite） | 需外接 |
| 定时任务 | 原生支持 | 原生支持 |
| 开发体验 | 一般 | 优秀 |
| 适用场景 | 全球用户 | 快速开发 |

**推荐：Cloudflare**（成本低，速度快，适合全球用户）


---

## 七、开发建议

### 7.1 开发顺序

1. **Week 1**: 搭建 Workers 基础框架 + D1 数据库
2. **Week 2**: 实现认证和订阅管理 API
3. **Week 3**: 实现新闻抓取、AI摘要、邮件推送
4. **Week 4**: 前端开发 + 联调 + 部署

### 7.2 注意事项

⚠️ **Workers CPU 限制**
- 免费版 CPU 时间限制 10ms
- AI 摘要可能超时，建议异步处理或升级付费版

⚠️ **D1 数据库限制**
- 单次查询最多返回 1000 行
- 不支持全文搜索

⚠️ **调试建议**
- 使用 `wrangler dev` 本地开发
- 使用 `console.log` 查看日志
- 使用 Cloudflare Dashboard 查看实时日志

---

**文档结束**

_基于 Cloudflare 的全栈技术方案_

