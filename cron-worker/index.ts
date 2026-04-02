/**
 * cron-worker/index.ts
 *
 * 独立的 Cloudflare Worker，每 15 分钟触发一次，
 * 调用 my-ai-news003 Pages 的 /api/cron/digest 接口。
 *
 * 部署命令：
 *   cd cron-worker && npx wrangler deploy
 */

export default {
  // Cron 定时触发
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    await triggerDigest(env);
  },

  // 手动 HTTP 触发（方便测试）
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname === '/trigger' && request.method === 'POST') {
      const result = await triggerDigest(env);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('Cron Worker — POST /trigger to run manually', { status: 200 });
  },
};

async function triggerDigest(env: Env) {
  const target = `${env.PAGES_BASE_URL}/api/cron/digest`;
  console.log(`[cron-worker] Triggering: ${target}`);

  try {
    const res = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': env.CRON_SECRET,
      },
    });

    const body = await res.json();
    console.log(`[cron-worker] Response ${res.status}:`, JSON.stringify(body));
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    console.error('[cron-worker] Failed:', e);
    return { ok: false, error: String(e) };
  }
}

interface Env {
  PAGES_BASE_URL: string;  // e.g. https://my-ai-news003.pages.dev
  CRON_SECRET: string;
}
