import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Scrape.do helpers ─────────────────────────────────────────────────────────

function buildScrapeDoUrl(token: string, targetUrl: string): string {
  const params = new URLSearchParams({
    token,
    url: targetUrl,
    render: "true",
    super: "true",
    waitUntil: "networkidle0",
    geoCode: "us",
  });
  return `https://api.scrape.do?${params.toString()}`;
}

function decodeHtmlEntities(text: string): string {
  return text.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (m) => {
    switch (m) {
      case "&amp;":  return "&";
      case "&lt;":   return "<";
      case "&gt;":   return ">";
      case "&quot;": return '"';
      case "&#39;":  return "'";
      case "&nbsp;": return " ";
      default:       return m;
    }
  });
}

function stripHtml(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script[^>]*>/gi, " ")
      .replace(/<style[\s\S]*?<\/style[^>]*>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
  );
}

function extractSentences(text: string, minLen = 20, maxLen = 300): string[] {
  return text
    .split(/[.!?\n\r|]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= minLen && s.length <= maxLen)
    .filter((s) => !/^(https?:|www\.|@|#|\d{1,2}:\d{2})/i.test(s));
}

/** Parse tweet text from rendered X search HTML. */
function parseXHtml(html: string): string[] {
  const results: string[] = [];

  // Primary: data-testid="tweetText" anchored segments
  const tweetRe = /data-testid="tweetText"[\s\S]{0,2000}?(?=data-testid="|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = tweetRe.exec(html)) !== null) {
    const text = stripHtml(match[0]).replace(/^tweetText\s*/i, "").trim();
    for (const s of extractSentences(text, 20, 300)) {
      if (!results.includes(s)) results.push(s);
    }
    if (results.length >= 25) break;
  }

  // Fallback: article tags
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

// ── Main serve ────────────────────────────────────────────────────────────────
interface ScrapedPost {
  id: string;
  text: string;
  author: string;
  platform: string;
  created_at: string;
}

function buildScrapeDoUrl(
  token: string,
  targetUrl: string,
  options: {
    render?: boolean;
    super?: boolean;
    waitUntil?: string;
    geoCode?: string;
  } = {}
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

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Parse rendered X.com search HTML into post objects. */
function parseXHtml(html: string, query: string): ScrapedPost[] {
  const posts: ScrapedPost[] = [];
  let idx = 0;

  // Strategy 1 – article[data-testid="tweet"] elements
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
          created_at: new Date().toISOString(),
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
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  return posts;
}

/** Parse Reddit JSON search API response into post objects. */
function parseRedditJson(data: unknown, query: string): ScrapedPost[] {
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
        created_at: post.created_utc
          ? new Date((post.created_utc as number) * 1000).toISOString()
          : new Date().toISOString(),
      });
    }
  }

  return posts;
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const SCRAPE_DO_TOKEN = Deno.env.get("SCRAPE_DO_TOKEN") || "";
    const PARALLEL_API_KEY = Deno.env.get("PARALLEL_API_KEY") || "";
    const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY") || "";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { topic_id } = await req.json();
    if (!topic_id) throw new Error("topic_id is required");

    const { data: topic, error: topicError } = await supabase
      .from("topics")
      .select("*")
      .eq("id", topic_id)
      .single();

    if (topicError || !topic) throw new Error("Topic not found");

    let posts: Array<{
      id: string;
      text: string;
      author: string;
      created_at: string;
      platform: string;
    }> = [];
    let sourceInfo = "";
    let scrapeStatus: "ok" | "blocked" | "quota" | "no_token" | "error" | "idle" = "idle";

    // ── Step 1: Scrape X via Scrape.do ────────────────────────────────────────
    if (SCRAPE_DO_TOKEN) {
      try {
        const xUrl = `https://x.com/search?q=${encodeURIComponent(topic.query)}&f=live`;
        const scrapeUrl = buildScrapeDoUrl(SCRAPE_DO_TOKEN, xUrl);

        console.log(`Scraping X for "${topic.query}" via Scrape.do…`);
        const res = await fetch(scrapeUrl);

        if (res.status === 402 || res.status === 429) {
          console.warn("Scrape.do quota exceeded for X");
          scrapeStatus = "quota";
        } else if (res.status === 403 || res.status === 407) {
          console.warn("Scrape.do blocked for X");
          scrapeStatus = "blocked";
        } else if (res.ok) {
          const html = await res.text();
          const isLoginWall =
            html.toLowerCase().includes("log in to x") && !html.includes('data-testid="tweet"');

          if (!isLoginWall) {
            const sentences = parseXHtml(html);
            if (sentences.length > 0) {
              posts = sentences.map((text, i) => ({
                id: `x_scrape_${topic_id}_${i}`,
                text,
                author: "@x_user",
                created_at: new Date().toISOString(),
                platform: "x",
              }));
              sourceInfo = "Scrape.do (X/Twitter)";
              scrapeStatus = "ok";
              console.log(`Scrape.do/X: extracted ${posts.length} posts`);
            } else {
              scrapeStatus = "blocked";
              console.warn("Scrape.do/X: no tweet text extracted (possible auth wall)");
            }
          } else {
            scrapeStatus = "blocked";
            console.warn("Scrape.do/X: login wall detected");
          }
        } else {
          scrapeStatus = "error";
          console.error(`Scrape.do/X HTTP ${res.status}`);
        }
      } catch (e) {
        scrapeStatus = "error";
        console.error("Scrape.do/X exception:", e);
      }
    } else {
      scrapeStatus = "no_token";
      console.warn("SCRAPE_DO_TOKEN not set — skipping X scrape");
    }

    // ── Step 2: YouTube fallback (if X scraping did not yield data) ───────────
    let posts: ScrapedPost[] = [];
    let sourceInfo = "Scrape.do (X + Reddit)";

    // ── Step 1: Scrape.do – X and Reddit in parallel ──────────────────────────
    if (SCRAPE_DO_TOKEN) {
      console.log(`Fetching "${topic.query}" via Scrape.do (X + Reddit)…`);
      const xUrl = `https://x.com/search?q=${encodeURIComponent(topic.query)}&src=typed_query&f=live`;
      const redditUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(topic.query)}&sort=new&limit=25`;

      const [xResult, redditResult] = await Promise.allSettled([
        fetch(buildScrapeDoUrl(SCRAPE_DO_TOKEN, xUrl, { render: true, waitUntil: "networkidle0" })),
        fetch(buildScrapeDoUrl(SCRAPE_DO_TOKEN, redditUrl, { render: false })),
      ]);

      if (xResult.status === "fulfilled" && xResult.value.ok) {
        const html = await xResult.value.text();
        const xPosts = parseXHtml(html, topic.query);
        console.log(`Scrape.do X: ${xPosts.length} posts`);
        posts.push(...xPosts);
      } else {
        console.warn("Scrape.do X fetch failed:", xResult.status === "rejected" ? xResult.reason : xResult.value.status);
      }

      if (redditResult.status === "fulfilled" && redditResult.value.ok) {
        try {
          const data = await redditResult.value.json();
          const redditPosts = parseRedditJson(data, topic.query);
          console.log(`Scrape.do Reddit: ${redditPosts.length} posts`);
          posts.push(...redditPosts);
        } catch {
          console.warn("Scrape.do Reddit: non-JSON response");
        }
      } else {
        console.warn("Scrape.do Reddit fetch failed:", redditResult.status === "rejected" ? redditResult.reason : redditResult.value.status);
      }

      if (posts.length > 0) {
        sourceInfo = `Scrape.do (X: ${posts.filter(p => p.platform === "x").length}, Reddit: ${posts.filter(p => p.platform === "reddit").length})`;
      }
    }

    // ── Step 2: Parallel.ai fallback (if Scrape.do unavailable or returned nothing) ──
    if (posts.length === 0 && PARALLEL_API_KEY) {
      console.log("Scrape.do unavailable. Trying Parallel.ai…");
      try {
        const parallelRes = await fetch("https://api.parallel.ai/v1beta/search", {
          method: "POST",
          headers: {
            "x-api-key": PARALLEL_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            objective: `Recent public opinions, discussions, and social media mentions about "${topic.query}" from Reddit, forums, and news.`,
            max_results: 10,
          }),
        });

        if (parallelRes.ok) {
          const parallelData = await parallelRes.json();
          const excerpts = parallelData?.excerpts || [];
          if (excerpts.length > 0) {
            posts = excerpts.map((e: { text?: string; source_url?: string }, i: number) => ({
              id: `parallel_${topic_id}_${i}`,
              text: e.text || "",
              author: e.source_url ? new URL(e.source_url).hostname : "web_source",
              created_at: new Date().toISOString(),
              platform: "web",
            }));
            sourceInfo = "Parallel.ai Social Search";
          }
        } else {
          console.error(`Parallel API error: ${parallelRes.status}`);
        }
      } catch (e) {
        console.error("Parallel API exception:", e);
      }
    }

    // ── Step 3: YouTube fallback ──────────────────────────────────────────────
    if (posts.length === 0 && YOUTUBE_API_KEY) {
      console.log("Trying YouTube fallback…");
      try {
        const ytUrl = new URL("https://www.googleapis.com/youtube/v3/search");
        ytUrl.searchParams.set("part", "snippet");
        ytUrl.searchParams.set("q", topic.query);
        ytUrl.searchParams.set("maxResults", "15");
        ytUrl.searchParams.set("type", "video");
        ytUrl.searchParams.set("key", YOUTUBE_API_KEY);

        const ytRes = await fetch(ytUrl.toString());
        if (ytRes.ok) {
          const ytData = await ytRes.json();
          sourceInfo = "YouTube Search API";
          posts = (ytData.items || []).map((item: { id?: { videoId?: string }; snippet: { title: string; description: string; channelTitle?: string; publishedAt?: string } }) => ({
            id: item.id?.videoId || Math.random().toString(),
            text: `${item.snippet.title}: ${item.snippet.description}`,
            author: item.snippet.channelTitle || "youtube_user",
            created_at: item.snippet.publishedAt || new Date().toISOString(),
            platform: "youtube",
          }));
          console.log(`YouTube fallback: fetched ${posts.length} items`);
        }
      } catch (e) {
        console.error("YouTube fallback failed:", e);
      }
    }

    // ── Step 3: Persist to DB ─────────────────────────────────────────────────
    // ── Step 4: Algorithmic fallback (if everything else fails) ──────────────
    if (posts.length === 0) {
      console.log("No live data found. Using algorithmic generation.");
      sourceInfo = "Algorithmic Generation";
      const templates = [
        `Huge buzz around ${topic.query} today!`,
        `People are really divided on the ${topic.query} situation.`,
        `The latest update for ${topic.query} is a total game changer.`,
        `Not impressed with ${topic.query} lately. Too much hype.`,
        `Why is nobody talking about ${topic.query}? This is massive.`
      ];
      posts = Array.from({ length: 10 }, (_, i) => ({
        id: `algo_${topic_id}_${i}`,
        text: templates[i % templates.length],
        author: `user_${Math.floor(Math.random() * 1000)}`,
        created_at: new Date().toISOString(),
        platform: "simulated",
      }));
    }

    // ── Step 5: Persist to DB ─────────────────────────────────────────────────
    let inserted = 0;
    for (const post of posts) {
      const { error } = await supabase.from("posts").upsert(
        {
          topic_id,
          platform: post.platform || "x",
          external_id: post.id,
          author: post.author.startsWith("@") ? post.author : `@${post.author}`,
          content: post.text,
          posted_at: post.created_at,
        },
        { onConflict: "platform,external_id" },
      );
      if (!error) inserted++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        fetched: posts.length,
        inserted,
        info: sourceInfo || "No data source available",
        scrape_status: scrapeStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("fetch-twitter unhandled error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal Error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
