import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const PARALLEL_API_KEY = Deno.env.get("PARALLEL_API_KEY") || "";
    const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY") || "";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { topic_id } = await req.json();
    if (!topic_id) throw new Error("topic_id is required");

    // Get topic query
    const { data: topic, error: topicError } = await supabase
      .from("topics")
      .select("*")
      .eq("id", topic_id)
      .single();

    if (topicError || !topic) throw new Error("Topic not found");

    let posts: any[] = [];
    let sourceInfo = "Parallel.ai Social Search";

    // ── Step 1: Try Parallel.ai Web & Social Search ──────────────────────────
    let parallelFailed = false;

    if (PARALLEL_API_KEY) {
      try {
        console.log(`Searching for "${topic.query}" via Parallel.ai…`);
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

        if (!parallelRes.ok) {
          console.error(`Parallel API error: ${parallelRes.status}`);
          parallelFailed = true;
        } else {
          const parallelData = await parallelRes.ok ? await parallelRes.json() : null;
          // Parallel API returns excerpts
          const excerpts = parallelData?.excerpts || [];
          
          if (excerpts.length > 0) {
            posts = excerpts.map((e: any, i: number) => ({
              id: `parallel_${topic_id}_${i}`,
              text: e.text || "",
              author: e.source_url ? new URL(e.source_url).hostname : "web_source",
              created_at: new Date().toISOString(),
              platform: "web"
            }));
          } else {
            parallelFailed = true;
          }
        }
      } catch (e) {
        console.error("Parallel API exception:", e);
        parallelFailed = true;
      }
    } else {
      parallelFailed = true;
    }

    // ── Step 2: YouTube fallback (if Parallel fails) ──────────────────────────
    if (parallelFailed) {
      console.log("Parallel API unavailable. Trying YouTube fallback…");
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
            platform: "youtube"
          }));
        }
      } catch (e) {
        console.error("YouTube fallback failed:", e);
      }
    }

    // ── Step 3: Algorithmic fallback (if everything else fails) ──────────────
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
        text: templates[i % templates.length].replace("${topic.query}", topic.query),
        author: `user_${Math.floor(Math.random() * 1000)}`,
        created_at: new Date().toISOString(),
        platform: "simulated"
      }));
    }

    // ── Step 4: Persist to DB ────────────────────────────────────────────────
    let inserted = 0;
    for (const post of posts) {
      const { error } = await supabase.from("posts").upsert(
        {
          topic_id,
          platform: post.platform || "web",
          external_id: post.id,
          author: post.author.startsWith('@') ? post.author : `@${post.author}`,
          content: post.text,
          posted_at: post.created_at,
        },
        { onConflict: "platform,external_id" }
      );
      if (!error) inserted++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        fetched: posts.length,
        inserted,
        info: sourceInfo,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("fetch-social unhandled error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Internal Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
