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

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const SCRAPE_DO_TOKEN = Deno.env.get("SCRAPE_DO_TOKEN") || "";
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
          posts = (ytData.items || []).map((item: any) => ({
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
