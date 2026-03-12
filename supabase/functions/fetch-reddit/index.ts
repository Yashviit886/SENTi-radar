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

function extractSentences(text: string, minLen = 25, maxLen = 320): string[] {
  return text
    .split(/[.!?\n\r|]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= minLen && s.length <= maxLen)
    .filter((s) => !/^(https?:|www\.|@|#|\d{1,2}:\d{2})/i.test(s));
}

/**
 * Parse post titles and snippets from rendered Reddit search HTML.
 *
 * Reddit's new design uses `<shreddit-post>` custom elements whose
 * `post-title` attribute contains the title.  We fall back to `<h3>` tags
 * (classic Reddit) and `<p>` body-preview paragraphs.
 */
function parseRedditHtml(html: string): string[] {
  const results: string[] = [];

  // Strategy 1: shreddit-post web-component attribute
  const shredditRe = /post-title="([^"]{20,300})"/gi;
  let match: RegExpExecArray | null;

  while ((match = shredditRe.exec(html)) !== null) {
    const title = decodeHtmlEntities(match[1]).trim();
    if (!results.includes(title)) results.push(title);
    if (results.length >= 20) break;
  }

  // Strategy 2: h3 headings (classic Reddit / mobile fallback)
  if (results.length < 3) {
    const h3Re = /<h3[^>]*>([\s\S]{20,300}?)<\/h3>/gi;
    while ((match = h3Re.exec(html)) !== null) {
      const text = stripHtml(match[1]).trim();
      if (text.length >= 20 && !results.includes(text)) results.push(text);
      if (results.length >= 20) break;
    }
  }

  // Strategy 3: paragraph snippets (post-body previews)
  if (results.length < 5) {
    const pRe = /<p[^>]*>([\s\S]{30,300}?)<\/p>/gi;
    while ((match = pRe.exec(html)) !== null) {
      const text = stripHtml(match[1]).trim();
      if (text.length >= 30 && !results.includes(text)) results.push(text);
      if (results.length >= 20) break;
    }
  }

  // Strategy 4: generic sentence extraction from full page text
  if (results.length < 5) {
    const plain = stripHtml(html);
    const sentences = extractSentences(plain, 30, 300);
    for (const s of sentences) {
      if (!results.includes(s)) results.push(s);
      if (results.length >= 20) break;
    }
  }

  return results.slice(0, 20);
}

// ── Main serve ────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const SCRAPE_DO_TOKEN = Deno.env.get("SCRAPE_DO_TOKEN") || "";

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
    }> = [];
    let scrapeStatus: "ok" | "blocked" | "quota" | "no_token" | "error" = "error";

    if (!SCRAPE_DO_TOKEN) {
      scrapeStatus = "no_token";
      console.warn("SCRAPE_DO_TOKEN not set — skipping Reddit scrape");
    } else {
      try {
        const redditUrl = `https://www.reddit.com/search/?q=${encodeURIComponent(topic.query)}&sort=new`;
        const scrapeUrl = buildScrapeDoUrl(SCRAPE_DO_TOKEN, redditUrl);

        console.log(`Scraping Reddit for "${topic.query}" via Scrape.do…`);
        const res = await fetch(scrapeUrl);

        if (res.status === 402 || res.status === 429) {
          scrapeStatus = "quota";
          console.warn("Scrape.do quota exceeded for Reddit");
        } else if (res.status === 403 || res.status === 407) {
          scrapeStatus = "blocked";
          console.warn("Scrape.do blocked for Reddit");
        } else if (res.ok) {
          const html = await res.text();

          if (html.includes("Are you a human?") || (!html.toLowerCase().includes("reddit") && html.length < 5000)) {
            scrapeStatus = "blocked";
            console.warn("Scrape.do/Reddit: bot-check or empty page detected");
          } else {
            const sentences = parseRedditHtml(html);
            if (sentences.length > 0) {
              posts = sentences.map((text, i) => ({
                id: `reddit_scrape_${topic_id}_${i}`,
                text,
                author: "reddit_user",
                created_at: new Date().toISOString(),
              }));
              scrapeStatus = "ok";
              console.log(`Scrape.do/Reddit: extracted ${posts.length} posts`);
            } else {
              scrapeStatus = "blocked";
              console.warn("Scrape.do/Reddit: no post text extracted");
            }
          }
        } else {
          scrapeStatus = "error";
          console.error(`Scrape.do/Reddit HTTP ${res.status}`);
        }
      } catch (e) {
        scrapeStatus = "error";
        console.error("Scrape.do/Reddit exception:", e);
      }
    }

    // ── Persist to DB ─────────────────────────────────────────────────────────
    let inserted = 0;
    for (const post of posts) {
      const { error } = await supabase.from("posts").upsert(
        {
          topic_id,
          platform: "reddit",
          external_id: post.id,
          author: `@${post.author}`,
          content: post.text,
          posted_at: post.created_at,
        },
        { onConflict: "platform,external_id" },
      );
      if (!error) inserted++;
    }

    return new Response(
      JSON.stringify({
        success: scrapeStatus === "ok",
        fetched: posts.length,
        inserted,
        info: scrapeStatus === "ok" ? "Scrape.do (Reddit)" : `Reddit unavailable: ${scrapeStatus}`,
        scrape_status: scrapeStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("fetch-reddit unhandled error:", error);
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
