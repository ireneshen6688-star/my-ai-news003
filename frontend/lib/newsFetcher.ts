/**
 * lib/newsFetcher.ts
 *
 * Real RSS-based news fetcher.
 * Pulls from a curated whitelist of high-quality, low-legal-risk RSS feeds.
 * Only stores: title, url, source, published_at, description snippet (≤300 chars).
 * Full text is NEVER fetched or stored.
 */

export interface RawArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: number; // epoch seconds
  snippet: string;     // RSS description ≤300 chars, used only for AI summary generation
}

// ── Curated RSS source whitelist ──────────────────────────────────────────────
const RSS_SOURCES = [
  // General / World
  { name: 'Reuters',        url: 'https://feeds.reuters.com/reuters/topNews' },
  { name: 'AP News',        url: 'https://feeds.apnews.com/ApTop25News' },
  { name: 'BBC News',       url: 'http://feeds.bbci.co.uk/news/rss.xml' },
  { name: 'The Guardian',   url: 'https://www.theguardian.com/world/rss' },

  // Tech / AI
  { name: 'TechCrunch',     url: 'https://techcrunch.com/feed/' },
  { name: 'The Verge',      url: 'https://www.theverge.com/rss/index.xml' },
  { name: 'Wired',          url: 'https://www.wired.com/feed/rss' },
  { name: 'Ars Technica',   url: 'https://feeds.arstechnica.com/arstechnica/index' },
  { name: 'VentureBeat',    url: 'https://venturebeat.com/feed/' },
  { name: 'MIT Tech Review',url: 'https://www.technologyreview.com/feed/' },

  // Business / Finance
  { name: 'Financial Times',url: 'https://www.ft.com/rss/home' },
  { name: 'Bloomberg Tech', url: 'https://feeds.bloomberg.com/technology/news.rss' },
  { name: 'CNBC Tech',      url: 'https://www.cnbc.com/id/19854910/device/rss/rss.html' },

  // Science
  { name: 'Nature News',    url: 'https://www.nature.com/nature.rss' },
  { name: 'Science Daily',  url: 'https://www.sciencedaily.com/rss/top/science.xml' },
];

/** Normalize a URL: strip utm params, trailing slashes, fragments */
export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    // Remove tracking params
    ['utm_source','utm_medium','utm_campaign','utm_content','utm_term',
     'ref','source','via','cmp'].forEach(p => u.searchParams.delete(p));
    u.hash = '';
    let href = u.toString();
    if (href.endsWith('/')) href = href.slice(0, -1);
    return href.toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

/** Parse a date string into epoch seconds */
function parseDate(dateStr: string | undefined): number {
  if (!dateStr) return Math.floor(Date.now() / 1000);
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return Math.floor(Date.now() / 1000);
  return Math.floor(d.getTime() / 1000);
}

/** Strip HTML tags from text */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Fetch and parse a single RSS/Atom feed */
async function fetchFeed(source: { name: string; url: string }): Promise<RawArticle[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MyAINewsBot/1.0; +https://myainews.club)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const xml = await res.text();
    return parseXmlFeed(xml, source.name);
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

/** Parse RSS/Atom XML string into RawArticle[] */
function parseXmlFeed(xml: string, sourceName: string): RawArticle[] {
  const articles: RawArticle[] = [];

  // Atom feed items: <entry>
  const isAtom = xml.includes('<feed') && xml.includes('<entry');

  if (isAtom) {
    const entries = xml.match(/<entry[\s\S]*?<\/entry>/g) || [];
    for (const entry of entries) {
      const title = extractTag(entry, 'title');
      const link = extractAtomLink(entry);
      const published = extractTag(entry, 'published') || extractTag(entry, 'updated');
      const summary = extractTag(entry, 'summary') || extractTag(entry, 'content');

      if (!title || !link) continue;
      articles.push({
        title: stripHtml(title),
        url: link,
        source: sourceName,
        publishedAt: parseDate(published),
        snippet: stripHtml(summary || '').slice(0, 300),
      });
    }
  } else {
    // RSS feed: <item>
    const items = xml.match(/<item[\s\S]*?<\/item>/g) || [];
    for (const item of items) {
      const title = extractTag(item, 'title');
      const link = extractTag(item, 'link') || extractTag(item, 'guid');
      const pubDate = extractTag(item, 'pubDate') || extractTag(item, 'dc:date');
      const description = extractTag(item, 'description');

      if (!title || !link) continue;
      // Skip if link looks like a GUID (not a URL)
      if (!link.startsWith('http')) continue;

      articles.push({
        title: stripHtml(title),
        url: link,
        source: sourceName,
        publishedAt: parseDate(pubDate),
        snippet: stripHtml(description || '').slice(0, 300),
      });
    }
  }

  return articles;
}

function extractTag(xml: string, tag: string): string {
  // Handle CDATA
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i'));
  if (cdataMatch) return cdataMatch[1].trim();

  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? match[1].trim() : '';
}

function extractAtomLink(entry: string): string {
  // <link href="..." rel="alternate" />  or  <link>...</link>
  const hrefMatch = entry.match(/<link[^>]+href=["']([^"']+)["'][^>]*(?:rel=["']alternate["'])?[^>]*\/?>/i);
  if (hrefMatch) return hrefMatch[1];
  const textMatch = entry.match(/<link[^>]*>([^<]+)<\/link>/i);
  return textMatch ? textMatch[1].trim() : '';
}

// ── Keyword relevance check ───────────────────────────────────────────────────

/**
 * Check if an article is relevant to a keyword.
 * Matches title + snippet against keyword terms.
 */
export function isRelevant(article: RawArticle, keyword: string): boolean {
  const terms = keyword.toLowerCase().split(/[,，\s]+/).filter(Boolean);
  const haystack = (article.title + ' ' + article.snippet).toLowerCase();
  // At least one term must appear in title+snippet
  return terms.some(term => term.length > 1 && haystack.includes(term));
}

// ── Main export: fetch news for a keyword ────────────────────────────────────

export interface FetchNewsOptions {
  keyword: string;
  limit?: number;         // max articles to return
  sinceEpoch?: number;    // only articles published after this time
}

export interface NewsResult {
  title: string;
  url: string;
  normalizedUrl: string;
  source: string;
  publishedAt: number;
  snippet: string;
}

/**
 * Fetch real news from RSS feeds relevant to a keyword.
 * Pulls all sources in small batches, filters by keyword relevance.
 */
export async function fetchNewsForKeyword(opts: FetchNewsOptions): Promise<NewsResult[]> {
  const { keyword, limit = 20, sinceEpoch } = opts;
  const cutoff = sinceEpoch || (Math.floor(Date.now() / 1000) - 7 * 86400); // default: last 7 days

  const allArticles: RawArticle[] = [];

  // Fetch sources in batches of 4 (avoid hammering)
  const BATCH = 4;
  for (let i = 0; i < RSS_SOURCES.length; i += BATCH) {
    const batch = RSS_SOURCES.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(fetchFeed));
    results.forEach(articles => allArticles.push(...articles));
  }

  // Filter: relevant + within time window
  const relevant = allArticles.filter(a =>
    a.publishedAt >= cutoff && isRelevant(a, keyword)
  );

  // Deduplicate by normalized URL
  const seen = new Set<string>();
  const deduped: NewsResult[] = [];
  for (const a of relevant) {
    const norm = normalizeUrl(a.url);
    if (!seen.has(norm)) {
      seen.add(norm);
      deduped.push({ ...a, normalizedUrl: norm });
    }
  }

  // Sort by recency, return top N
  deduped.sort((a, b) => b.publishedAt - a.publishedAt);
  return deduped.slice(0, limit);
}
