/**
 * lib/verifyLinks.ts
 *
 * Utility: given a list of news articles (each with a `url`),
 * verify that each URL responds with HTTP 2xx/3xx.
 * Articles whose links are broken / unreachable are dropped.
 *
 * This is the "铁律": every news item delivered to the user
 * MUST have a working source link.
 */

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary: string;
  language: 'en' | 'zh';
}

/**
 * Verify a single URL by sending a HEAD request (falls back to GET).
 * Returns true if the URL is accessible (2xx or 3xx).
 */
export async function isLinkAccessible(url: string, timeoutMs = 8000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MyAINewsBot/1.0)',
      },
    });

    clearTimeout(timer);

    // Some servers reject HEAD; retry with GET
    if (response.status === 405) {
      const controller2 = new AbortController();
      const timer2 = setTimeout(() => controller2.abort(), timeoutMs);
      response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller2.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MyAINewsBot/1.0)',
        },
      });
      clearTimeout(timer2);
    }

    return response.status < 400;
  } catch {
    // Network error, timeout, DNS failure, etc.
    return false;
  }
}

/**
 * Filter a list of articles to only those with accessible URLs.
 * Runs checks in parallel (capped at 5 concurrent).
 */
export async function filterVerifiedArticles(articles: NewsArticle[]): Promise<NewsArticle[]> {
  const CONCURRENCY = 5;
  const results: NewsArticle[] = [];

  for (let i = 0; i < articles.length; i += CONCURRENCY) {
    const batch = articles.slice(i, i + CONCURRENCY);
    const checks = await Promise.all(
      batch.map(async (article) => ({
        article,
        ok: await isLinkAccessible(article.url),
      }))
    );
    for (const { article, ok } of checks) {
      if (ok) results.push(article);
    }
  }

  return results;
}
