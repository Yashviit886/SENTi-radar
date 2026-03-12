import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Orchestrator: creates topic, fetches data, analyzes sentiment
serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { query, title, hashtag } = await req.json();
    if (!query) throw new Error("query is required");

    const topicTitle = title || query;
    const topicHashtag = hashtag || `#${query.replace(/\s+/g, "")}`;

    // Check if topic already exists
    const { data: existingTopic } = await supabase
      .from("topics")
      .select("*")
      .eq("query", query)
      .limit(1);

    let topicId: string;

    if (existingTopic && existingTopic.length > 0) {
      topicId = existingTopic[0].id;
    } else {
      const { data: newTopic, error: insertError } = await supabase
        .from("topics")
        .insert({
          title: topicTitle,
          hashtag: topicHashtag,
          query,
          is_trending: false,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      topicId = newTopic.id;
    }

    // ── Fetch from X via Scrape.do (with YouTube fallback inside the function) ─
    const twitterResult = { success: false, info: "", scrape_status: "" };
    try {
      const twitterRes = await fetch(
        `${supabaseUrl}/functions/v1/fetch-twitter`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ topic_id: topicId }),
        },
      );

      if (twitterRes.ok) {
        const twitterData = await twitterRes.json();
        twitterResult.success = twitterData.success === true;
        if (twitterData.info) twitterResult.info = twitterData.info;
        if (twitterData.scrape_status) twitterResult.scrape_status = twitterData.scrape_status;
      } else {
        const body = await twitterRes.text().catch(() => "");
        console.error(
          `fetch-twitter Edge Function returned ${twitterRes.status}:`,
          body.substring(0, 300),
        );
        twitterResult.info = `fetch-twitter returned HTTP ${twitterRes.status}`;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      console.error("Could not reach fetch-twitter function:", msg);
      twitterResult.info = `fetch-twitter unreachable: ${msg}`;
    }

    // ── Fetch from Reddit via Scrape.do ───────────────────────────────────────
    const redditResult = { success: false, info: "", scrape_status: "" };
    try {
      const redditRes = await fetch(
        `${supabaseUrl}/functions/v1/fetch-reddit`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ topic_id: topicId }),
        },
      );

      if (redditRes.ok) {
        const redditData = await redditRes.json();
        redditResult.success = redditData.success === true;
        if (redditData.info) redditResult.info = redditData.info;
        if (redditData.scrape_status) redditResult.scrape_status = redditData.scrape_status;
      } else {
        const body = await redditRes.text().catch(() => "");
        console.error(
          `fetch-reddit Edge Function returned ${redditRes.status}:`,
          body.substring(0, 300),
        );
        redditResult.info = `fetch-reddit returned HTTP ${redditRes.status}`;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      console.error("Could not reach fetch-reddit function:", msg);
      redditResult.info = `fetch-reddit unreachable: ${msg}`;
    }

    // ── Fetch from YouTube ────────────────────────────────────────────────────
    const youtubeResult = { success: false, info: "" };
    try {
      const ytRes = await fetch(`${supabaseUrl}/functions/v1/fetch-youtube`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic_id: topicId }),
      });

      if (ytRes.ok) {
        const ytData = await ytRes.json();
        youtubeResult.success = ytData.success === true;
        if (ytData.info) youtubeResult.info = ytData.info;
      } else {
        const body = await ytRes.text().catch(() => "");
        console.error(
          `fetch-youtube Edge Function returned ${ytRes.status}:`,
          body.substring(0, 300),
        );
        youtubeResult.info = `fetch-youtube returned HTTP ${ytRes.status}`;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      console.error("Could not reach fetch-youtube function:", msg);
      youtubeResult.info = `fetch-youtube unreachable: ${msg}`;
    }

    // ── Run sentiment analysis ────────────────────────────────────────────────
    const analysisResult = { success: false, error: "" };
    try {
      const analysisRes = await fetch(
        `${supabaseUrl}/functions/v1/analyze-sentiment`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ topic_id: topicId }),
        },
      );

      if (analysisRes.ok) {
        const analysisData = await analysisRes.json();
        analysisResult.success = analysisData.success === true;
        if (analysisData.error) analysisResult.error = analysisData.error;
      } else {
        const body = await analysisRes.text().catch(() => "");
        console.error(
          `analyze-sentiment Edge Function returned ${analysisRes.status}:`,
          body.substring(0, 300),
        );
        analysisResult.error = `analyze-sentiment returned HTTP ${analysisRes.status}`;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Analysis failed";
      console.error("Could not reach analyze-sentiment function:", msg);
      analysisResult.error = msg;
    }

    return new Response(
      JSON.stringify({
        success: true,
        topic_id: topicId,
        twitter: twitterResult,
        reddit: redditResult,
        youtube: youtubeResult,
        analysis: analysisResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("analyze-topic unhandled error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
