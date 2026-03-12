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
    const YOUTUBE_API_KEY =
      Deno.env.get("YOUTUBE_API_KEY") ||
      "";

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

    // Step 1: Search for relevant videos
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("q", topic.query);
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("maxResults", "5");
    searchUrl.searchParams.set("order", "date");
    searchUrl.searchParams.set("key", YOUTUBE_API_KEY);

    const searchResponse = await fetch(searchUrl.toString());
    if (!searchResponse.ok) {
      const errText = await searchResponse.text().catch(() => "");
      console.error(
        `YouTube search API error [${searchResponse.status}]: ${errText.substring(0, 200)}`,
      );
      return new Response(
        JSON.stringify({
          success: false,
          fetched: 0,
          inserted: 0,
          info: `YouTube API returned ${searchResponse.status}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const searchData = await searchResponse.json();
    const videoIds = (searchData.items || [])
      .map((item: any) => item.id?.videoId)
      .filter(Boolean);

    if (videoIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          fetched: 0,
          inserted: 0,
          info: "No YouTube videos found for this topic",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Step 2: Fetch comments for each video
    let totalInserted = 0;
    let totalFetched = 0;

    for (const videoId of videoIds) {
      const commentsUrl = new URL(
        "https://www.googleapis.com/youtube/v3/commentThreads",
      );
      commentsUrl.searchParams.set("part", "snippet");
      commentsUrl.searchParams.set("videoId", videoId);
      commentsUrl.searchParams.set("maxResults", "20");
      commentsUrl.searchParams.set("order", "relevance");
      commentsUrl.searchParams.set("key", YOUTUBE_API_KEY);

      const commentsResponse = await fetch(commentsUrl.toString());
      if (!commentsResponse.ok) {
        console.error(`Comments fetch failed for video ${videoId}`);
        await commentsResponse.text(); // consume body
        continue;
      }

      const commentsData = await commentsResponse.json();
      const comments = commentsData.items || [];
      totalFetched += comments.length;

      for (const comment of comments) {
        const snippet = comment.snippet?.topLevelComment?.snippet;
        if (!snippet) continue;

        const { error } = await supabase.from("posts").upsert(
          {
            topic_id,
            platform: "youtube",
            external_id: comment.id,
            author: snippet.authorDisplayName || "Anonymous",
            content: snippet.textDisplay?.replace(/<[^>]*>/g, "") || "",
            posted_at: snippet.publishedAt,
          },
          { onConflict: "platform,external_id" },
        );
        if (!error) totalInserted++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        fetched: totalFetched,
        inserted: totalInserted,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("fetch-youtube unhandled error:", error);
    // Return success:false but NOT status 500 so the orchestrator keeps going
    return new Response(
      JSON.stringify({
        success: false,
        fetched: 0,
        inserted: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
