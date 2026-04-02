/**
 * lib/aiSummarizer.ts
 *
 * AI summary generation using OpenAI-compatible API.
 * Only called on final candidate articles — NOT on raw feed data.
 * Uses cheap/fast model (gpt-4o-mini) to control costs.
 */

export interface ArticleForSummary {
  title: string;
  snippet: string;
  source: string;
  keyword: string;
}

export interface SummaryResult {
  summary: string;
  relevanceReason: string;
}

/**
 * Generate a short AI summary + relevance reason for a single article.
 * Falls back to snippet if API call fails.
 */
export async function generateSummary(
  article: ArticleForSummary,
): Promise<SummaryResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Fallback: use snippet as summary
    return {
      summary: article.snippet.slice(0, 120) || article.title,
      relevanceReason: `Related to "${article.keyword}"`,
    };
  }

  const prompt = `You are an objective news editor. Given the article below, write:
1. A concise 1-2 sentence neutral summary (max 100 words). Do NOT copy the title. Do NOT be sensational.
2. One short sentence explaining why this is relevant to the keyword: "${article.keyword}"

Article title: ${article.title}
Source: ${article.source}
Content snippet: ${article.snippet}

Respond in this exact JSON format:
{"summary": "...", "relevanceReason": "..."}`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = data.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(content) as SummaryResult;
    return {
      summary: parsed.summary || article.snippet.slice(0, 120),
      relevanceReason: parsed.relevanceReason || `Related to "${article.keyword}"`,
    };
  } catch {
    return {
      summary: article.snippet.slice(0, 120) || article.title,
      relevanceReason: `Related to "${article.keyword}"`,
    };
  }
}

/**
 * Batch-generate summaries for multiple articles.
 * Caps at 20 articles to control cost.
 */
export async function generateSummariesBatch(
  articles: ArticleForSummary[],
): Promise<SummaryResult[]> {
  const capped = articles.slice(0, 20);
  // Process sequentially to avoid rate limits on free-tier
  const results: SummaryResult[] = [];
  for (const a of capped) {
    results.push(await generateSummary(a));
  }
  return results;
}
