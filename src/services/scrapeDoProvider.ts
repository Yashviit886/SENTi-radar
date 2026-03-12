/**
 * Scrape.do universal data provider
 *
 * Fetches live content from X (Twitter) and Reddit via Scrape.do's API,
 * which supports JavaScript rendering, residential proxies, and full HTML
 * access to heavy client-side pages.
 *
 * Architecture note: Extend by adding new provider functions (e.g. fetchHackerNews,
 * fetchLinkedIn) that accept a token + options and return ScrapeDoResult.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface ScrapedPost {
  id: string;
  text: string;
  author: string;
  platform: "x" | "reddit" | "web";
  url: string;
  postedAt: string;
}

export interface ScrapeDoOptions {
  /** Enable JavaScript rendering (essential for X, Reddit). Default: true */
  render?: boolean;
  /** Use residential/mobile proxies to bypass datacenter detection. Default: false */
  super?: boolean;
  /** Wait strategy before returning HTML. Default: 'networkidle0' */
  waitUntil?: "networkidle0" | "networkidle2" | "load" | "domcontentloaded";
  /** ISO country code for geo-targeted results, e.g. 'us', 'gb', 'in'. */
  geoCode?: string;
}

export type ScrapeDoStatus = "success" | "partial" | "error";

export interface ScrapeDoResult {
  posts: ScrapedPost[];
  /** Human-readable label shown in UI source chips, e.g. 'X via Scrape.do' */
  source: string;
  status: ScrapeDoStatus;
  error?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build the Scrape.do proxy URL for the given target URL and options.
 */
export function buildApiUrl(
  token: string,
  targetUrl: string,
  options: ScrapeDoOptions = {}
): string {
  const params = new URLSearchParams();
  params.set("token", token);
  params.set("url", targetUrl);
  if (options.render !== false) params.set("render", "true");
  if (options.super) params.set("super", "true");
  if (options.waitUntil) params.set("waitUntil", options.waitUntil);
  if (options.geoCode) params.set("geoCode", options.geoCode);
  return `https://api.scrape.do?${params.toString()}`;
}

/** Decode common HTML entities in scraped text. */
export function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/** Strip all HTML tags from a string. */
export function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// ── X (Twitter) parser ───────────────────────────────────────────────────────

/**
 * Parse rendered X.com search HTML into ScrapedPost objects.
 *
 * Strategy 1 – article elements: X renders tweets inside
 *   <article data-testid="tweet"> … </article>
 *   with the tweet body in <div data-testid="tweetText">.
 *
 * Strategy 2 – lang spans fallback: if the page structure has changed,
 *   grab any <span lang="en"> longer than 20 chars.
 */
export function parseXHtml(html: string, query: string): ScrapedPost[] {
  const posts: ScrapedPost[] = [];
  let idx = 0;

  // Strategy 1 – tweet article elements
  const articleRe =
    /<article[^>]*data-testid="tweet"[^>]*>([\s\S]*?)<\/article>/gi;
  let m: RegExpExecArray | null;
  while ((m = articleRe.exec(html)) !== null && posts.length < 20) {
    const articleHtml = m[1];
    const textMatch = articleHtml.match(
      /data-testid="tweetText"[^>]*>([\s\S]*?)<\/div>/i
    );
    const userMatch = articleHtml.match(
      /data-testid="User-Name"[\s\S]*?<span[^>]*>(@[\w]+)<\/span>/i
    );
    if (textMatch) {
      const text = decodeEntities(stripTags(textMatch[1]));
      if (text.length > 10 && text.length < 600) {
        posts.push({
          id: `x_${idx++}`,
          text,
          author: userMatch?.[1] ?? "@x_user",
          platform: "x",
          url: `https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=live`,
          postedAt: new Date().toISOString(),
        });
      }
    }
  }

  // Strategy 2 – lang="en" span fallback
  if (posts.length === 0) {
    const spanRe = /<span[^>]*lang="en"[^>]*>([\s\S]*?)<\/span>/gi;
    let spanMatch: RegExpExecArray | null;
    while ((spanMatch = spanRe.exec(html)) !== null && posts.length < 15) {
      const text = decodeEntities(stripTags(spanMatch[1]));
      if (text.length > 20 && text.length < 500) {
        posts.push({
          id: `x_span_${idx++}`,
          text,
          author: "@x_user",
          platform: "x",
          url: `https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=live`,
          postedAt: new Date().toISOString(),
        });
      }
    }
  }

  return posts;
}

// ── Reddit parser ────────────────────────────────────────────────────────────

/**
 * Parse Reddit's JSON search API response (reddit.com/search.json)
 * into ScrapedPost objects.
 */
export function parseRedditJson(data: unknown, query: string): ScrapedPost[] {
  const posts: ScrapedPost[] = [];
  const record = data as Record<string, unknown>;
  const dataNode = record?.data as Record<string, unknown> | undefined;
  const children =
    (dataNode?.children as Array<Record<string, unknown>>) ?? [];

  for (const child of children) {
    const post = child?.data as Record<string, unknown> | undefined;
    if (!post) continue;
    const title = (post.title as string) ?? "";
    const selftext = (post.selftext as string) ?? "";
    const combined = [title, selftext].filter(Boolean).join(". ");
    const text = decodeEntities(combined.substring(0, 500));
    if (text.length > 10) {
      posts.push({
        id: `reddit_${post.id ?? posts.length}`,
        text,
        author: `u/${(post.author as string) ?? "redditor"}`,
        platform: "reddit",
        url:
          (post.url as string) ??
          `https://www.reddit.com/search/?q=${encodeURIComponent(query)}`,
        postedAt: post.created_utc
          ? new Date((post.created_utc as number) * 1000).toISOString()
          : new Date().toISOString(),
      });
    }
  }

  return posts;
}

// ── Public fetcher: X ────────────────────────────────────────────────────────

/**
 * Fetch live X (Twitter) posts for a query via Scrape.do.
 *
 * Uses JS rendering + networkidle0 wait so the React-heavy X.com SPA
 * is fully loaded before the HTML is captured.
 */
export async function fetchXPosts(
  query: string,
  token: string,
  options: ScrapeDoOptions = {}
): Promise<ScrapeDoResult> {
  const SOURCE = "X via Scrape.do";
  if (!token) {
    return {
      posts: [],
      source: SOURCE,
      status: "error",
      error: "VITE_SCRAPE_TOKEN not configured",
    };
  }

  const targetUrl = `https://x.com/search?q=${encodeURIComponent(
    query
  )}&src=typed_query&f=live`;
  const apiUrl = buildApiUrl(token, targetUrl, {
    render: true,
    waitUntil: "networkidle0",
    ...options,
  });

  try {
    const res = await fetch(apiUrl);
    if (!res.ok) {
      return {
        posts: [],
        source: SOURCE,
        status: "error",
        error: `Scrape.do returned HTTP ${res.status}`,
      };
    }
    const html = await res.text();
    const posts = parseXHtml(html, query);
    return {
      posts,
      source: SOURCE,
      status: posts.length > 0 ? "success" : "partial",
      error: posts.length === 0 ? "No posts parsed from X HTML" : undefined,
    };
  } catch (e) {
    return {
      posts: [],
      source: SOURCE,
      status: "error",
      error: e instanceof Error ? e.message : "Unknown fetch error",
    };
  }
}

// ── Public fetcher: Reddit ───────────────────────────────────────────────────

/**
 * Fetch Reddit posts for a query via Scrape.do.
 *
 * Targets Reddit's JSON search endpoint (render=false) which is far more
 * reliable than parsing the JavaScript-rendered HTML, yet still benefits
 * from Scrape.do's residential proxies when reddit.com blocks datacenter IPs.
 */
export async function fetchRedditPosts(
  query: string,
  token: string,
  options: ScrapeDoOptions = {}
): Promise<ScrapeDoResult> {
  const SOURCE = "Reddit via Scrape.do";
  if (!token) {
    return {
      posts: [],
      source: SOURCE,
      status: "error",
      error: "VITE_SCRAPE_TOKEN not configured",
    };
  }

  const targetUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(
    query
  )}&sort=new&limit=25`;
  const apiUrl = buildApiUrl(token, targetUrl, {
    render: false,
    ...options,
  });

  try {
    const res = await fetch(apiUrl);
    if (!res.ok) {
      return {
        posts: [],
        source: SOURCE,
        status: "error",
        error: `Scrape.do returned HTTP ${res.status}`,
      };
    }
    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        posts: [],
        source: SOURCE,
        status: "partial",
        error: "Reddit returned non-JSON (may require super=true)",
      };
    }
    const posts = parseRedditJson(data, query);
    return {
      posts,
      source: SOURCE,
      status: posts.length > 0 ? "success" : "partial",
      error: posts.length === 0 ? "No posts found on Reddit" : undefined,
    };
  } catch (e) {
    return {
      posts: [],
      source: SOURCE,
      status: "error",
      error: e instanceof Error ? e.message : "Unknown fetch error",
    };
  }
}

// ── Aggregated provider ──────────────────────────────────────────────────────

/**
 * Fetch from all requested sources in parallel and return merged results.
 *
 * @param query   Topic/keyword to search for
 * @param token   Scrape.do API token (from VITE_SCRAPE_TOKEN)
 * @param sources Which platforms to query (default: both x and reddit)
 * @param options Optional Scrape.do parameters applied to all sources
 */
export async function fetchAllScrapeDoSources(
  query: string,
  token: string,
  sources: Array<"x" | "reddit"> = ["x", "reddit"],
  options: ScrapeDoOptions = {}
): Promise<{ results: ScrapeDoResult[]; posts: ScrapedPost[] }> {
  const fetchers = sources.map((src) =>
    src === "x"
      ? fetchXPosts(query, token, options)
      : fetchRedditPosts(query, token, options)
  );

  const settled = await Promise.allSettled(fetchers);
  const results: ScrapeDoResult[] = settled.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    const label =
      sources[i] === "x" ? "X via Scrape.do" : "Reddit via Scrape.do";
    return {
      posts: [],
      source: label,
      status: "error" as const,
      error: String(r.reason),
    };
  });

  const posts = results.flatMap((r) => r.posts);
  return { results, posts };
}
