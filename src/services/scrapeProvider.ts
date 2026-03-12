/**
 * scrapeProvider.ts
 *
 * Modular Scrape.do client used by the frontend pipeline.
 *
 * Adding a new provider later (e.g. Firecrawl) is a matter of:
 *  1. Implementing a fetch function that returns `ScrapePost[]`.
 *  2. Registering it in `fetchSocialPosts` and extending `ProviderStatus`.
 */

/** Minimal representation of a scraped post / comment. */
export interface ScrapePost {
  text: string;
  author: string;
  source: 'x' | 'reddit' | 'news';
}

/** Status info returned alongside scraped posts. */
export interface ProviderStatus {
  x: 'ok' | 'blocked' | 'quota' | 'no_token' | 'error' | 'idle';
  reddit: 'ok' | 'blocked' | 'quota' | 'no_token' | 'error' | 'idle';
}

/** Human-readable label for a provider status value. */
export function providerStatusLabel(s: ProviderStatus['x']): string {
  switch (s) {
    case 'ok':       return 'Live';
    case 'blocked':  return 'Blocked by site';
    case 'quota':    return 'Quota exceeded';
    case 'no_token': return 'No API key';
    case 'error':    return 'Error';
    default:         return 'Not fetched';
  }
}

// ── Scrape.do URL builder ─────────────────────────────────────────────────────

const SCRAPE_DO_BASE = 'https://api.scrape.do';

/** Request timeout in milliseconds for Scrape.do calls (JS rendering can be slow). */
const SCRAPE_TIMEOUT_MS = 20_000;

function buildScrapeDoUrl(token: string, targetUrl: string): string {
  const params = new URLSearchParams({
    token,
    url: targetUrl,
    render: 'true',
    super: 'true',
    waitUntil: 'networkidle0',
    geoCode: 'us',
  });
  return `${SCRAPE_DO_BASE}?${params.toString()}`;
}

// ── HTML text extraction helpers ──────────────────────────────────────────────

/** Decode common HTML entities in a single pass (avoids double-unescaping). */
function decodeHtmlEntities(text: string): string {
  return text.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (m) => {
    switch (m) {
      case '&amp;':  return '&';
      case '&lt;':   return '<';
      case '&gt;':   return '>';
      case '&quot;': return '"';
      case '&#39;':  return "'";
      case '&nbsp;': return ' ';
      default:       return m;
    }
  });
}

/** Strip all HTML tags and decode common entities. */
function stripHtml(html: string): string {
  return decodeHtmlEntities(
    html
      // Remove script/style blocks. Use [^>]* so closing tags with unusual
      // whitespace (e.g. </script  >) are still matched.
      .replace(/<script[\s\S]*?<\/script[^>]*>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style[^>]*>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
}

/**
 * Split stripped text into plausible user-post sentences.
 * Keeps segments that are long enough to carry sentiment signal but not so
 * long that they are likely navigation/boilerplate.
 */
function extractSentences(text: string, minLen = 25, maxLen = 320): string[] {
  return text
    .split(/[.!?\n\r|]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= minLen && s.length <= maxLen)
    .filter((s) => !/^(https?:|www\.|@|#|\d{1,2}:\d{2})/i.test(s));
}

// ── X (Twitter) scraper ───────────────────────────────────────────────────────

function parseXHtml(html: string): string[] {
  const results: string[] = [];

  // Primary: extract segments anchored by data-testid="tweetText"
  const tweetSegmentRe = /data-testid="tweetText"[\s\S]{0,2000}?(?=data-testid="|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = tweetSegmentRe.exec(html)) !== null) {
    const text = stripHtml(match[0]).replace(/^tweetText\s*/i, '').trim();
    for (const s of extractSentences(text, 20, 320)) {
      if (!results.includes(s)) results.push(s);
    }
    if (results.length >= 25) break;
  }

  // Fallback: pull from article sections
  if (results.length < 3) {
    const articleRe = /<article[\s\S]*?<\/article>/gi;
    while ((match = articleRe.exec(html)) !== null) {
      const text = stripHtml(match[0]);
      for (const s of extractSentences(text, 30, 280)) {
        if (!results.includes(s)) results.push(s);
      }
      if (results.length >= 25) break;
    }
  }

  return results.slice(0, 25);
}

async function fetchFromX(
  token: string,
  query: string,
): Promise<{ posts: ScrapePost[]; status: ProviderStatus['x'] }> {
  if (!token) return { posts: [], status: 'no_token' };

  const xUrl = `https://x.com/search?q=${encodeURIComponent(query)}&f=live`;
  const scrapeUrl = buildScrapeDoUrl(token, xUrl);

  try {
    const res = await fetch(scrapeUrl, { signal: AbortSignal.timeout(SCRAPE_TIMEOUT_MS) });

    if (res.status === 402 || res.status === 429) return { posts: [], status: 'quota' };
    if (res.status === 403 || res.status === 407) return { posts: [], status: 'blocked' };
    if (!res.ok) {
      console.warn(`Scrape.do/X HTTP ${res.status}`);
      return { posts: [], status: 'error' };
    }

    const html = await res.text();

    if (html.includes('Log in to X') && !html.includes('data-testid="tweet"')) {
      return { posts: [], status: 'blocked' };
    }

    const sentences = parseXHtml(html);
    if (sentences.length === 0) return { posts: [], status: 'blocked' };

    return {
      posts: sentences.map((text) => ({ text, author: '@x_user', source: 'x' as const })),
      status: 'ok',
    };
  } catch (e) {
    console.warn('Scrape.do/X error:', e);
    return { posts: [], status: 'error' };
  }
}

// ── Reddit scraper ────────────────────────────────────────────────────────────

function parseRedditHtml(html: string): string[] {
  const results: string[] = [];

  // Strategy 1: shreddit-post custom element `post-title` attribute
  const shredditRe = /post-title="([^"]{20,300})"/gi;
  let match: RegExpExecArray | null;
  while ((match = shredditRe.exec(html)) !== null) {
    const title = decodeHtmlEntities(match[1]).trim();
    if (!results.includes(title)) results.push(title);
    if (results.length >= 20) break;
  }

  // Strategy 2: h3 headings (classic Reddit / fallback)
  if (results.length < 3) {
    const h3Re = /<h3[^>]*>([\s\S]{20,300}?)<\/h3>/gi;
    while ((match = h3Re.exec(html)) !== null) {
      const text = stripHtml(match[1]).trim();
      if (text.length >= 20 && !results.includes(text)) results.push(text);
      if (results.length >= 20) break;
    }
  }

  // Strategy 3: paragraph snippets (post body previews)
  if (results.length < 5) {
    const pRe = /<p[^>]*>([\s\S]{30,300}?)<\/p>/gi;
    while ((match = pRe.exec(html)) !== null) {
      const text = stripHtml(match[1]).trim();
      if (text.length >= 30 && !results.includes(text)) results.push(text);
      if (results.length >= 20) break;
    }
  }

  return results.slice(0, 20);
}

async function fetchFromReddit(
  token: string,
  query: string,
): Promise<{ posts: ScrapePost[]; status: ProviderStatus['reddit'] }> {
  if (!token) return { posts: [], status: 'no_token' };

  const redditUrl = `https://www.reddit.com/search/?q=${encodeURIComponent(query)}&sort=new`;
  const scrapeUrl = buildScrapeDoUrl(token, redditUrl);

  try {
    const res = await fetch(scrapeUrl, { signal: AbortSignal.timeout(SCRAPE_TIMEOUT_MS) });

    if (res.status === 402 || res.status === 429) return { posts: [], status: 'quota' };
    if (res.status === 403 || res.status === 407) return { posts: [], status: 'blocked' };
    if (!res.ok) {
      console.warn(`Scrape.do/Reddit HTTP ${res.status}`);
      return { posts: [], status: 'error' };
    }

    const html = await res.text();

    // Bot-check heuristics (mirrors the logic in supabase/functions/fetch-reddit/index.ts;
    // kept separate because this code runs in the browser, not in a Deno edge function).
    if (html.includes('Are you a human?') || (!html.includes('reddit') && html.length < 5000)) {
      return { posts: [], status: 'blocked' };
    }

    const sentences = parseRedditHtml(html);
    if (sentences.length === 0) return { posts: [], status: 'blocked' };

    return {
      posts: sentences.map((text) => ({ text, author: 'reddit_user', source: 'reddit' as const })),
      status: 'ok',
    };
  } catch (e) {
    console.warn('Scrape.do/Reddit error:', e);
    return { posts: [], status: 'error' };
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface FetchSocialResult {
  posts: ScrapePost[];
  providerStatus: ProviderStatus;
}

/**
 * Fetch posts from X and Reddit in parallel via Scrape.do.
 *
 * To add a new provider (e.g. Firecrawl) in the future:
 *   1. Write a `fetchFromFirecrawl()` function.
 *   2. Add a `firecrawl` key to `ProviderStatus`.
 *   3. Call it here in `Promise.allSettled([...])`.
 */
export async function fetchSocialPosts(
  token: string,
  query: string,
): Promise<FetchSocialResult> {
  const [xResult, redditResult] = await Promise.allSettled([
    fetchFromX(token, query),
    fetchFromReddit(token, query),
  ]);

  const xData =
    xResult.status === 'fulfilled' ? xResult.value : { posts: [], status: 'error' as const };
  const redditData =
    redditResult.status === 'fulfilled' ? redditResult.value : { posts: [], status: 'error' as const };

  return {
    posts: [...xData.posts, ...redditData.posts],
    providerStatus: { x: xData.status, reddit: redditData.status },
  };
}
