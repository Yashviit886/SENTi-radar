import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active topics
    const { data: topics, error: topicsError } = await supabase
      .from("topics")
      .select("id, title, query")
      .eq("is_active", true);

    if (topicsError) throw topicsError;
    if (!topics || topics.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No active topics to monitor", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ topic_id: string; title: string; status: string; error?: string }> = [];

    for (const topic of topics) {
      try {
        // Re-analyze: fetch new data + run sentiment analysis via the orchestrator
        const res = await fetch(`${supabaseUrl}/functions/v1/analyze-topic`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: topic.query, title: topic.title }),
        });

        const data = await res.json();

        // Check for crisis-level changes and generate alerts
        const { data: stats } = await supabase
          .from("topic_stats")
          .select("crisis_level, overall_sentiment, volatility")
          .eq("topic_id", topic.id)
          .order("computed_at", { ascending: false })
          .limit(1)
          .single();

        if (stats) {
          // Alert on high crisis
          if (stats.crisis_level === "high") {
            await supabase.from("alerts").insert({
              topic_id: topic.id,
              alert_type: "crisis_spike",
              severity: "high",
              message: `🚨 Crisis spike detected for "${topic.title}". Volatility: ${stats.volatility || 0}/100. Sentiment: ${stats.overall_sentiment || "unknown"}.`,
            });
          }

          // Alert on medium crisis
          if (stats.crisis_level === "medium") {
            await supabase.from("alerts").insert({
              topic_id: topic.id,
              alert_type: "sentiment_shift",
              severity: "medium",
              message: `⚠️ Elevated negativity for "${topic.title}". Crisis level: medium. Monitor closely.`,
            });
          }

          // Alert on negative sentiment dominance
          if (stats.overall_sentiment === "negative" && (stats.volatility || 0) > 60) {
            await supabase.from("alerts").insert({
              topic_id: topic.id,
              alert_type: "negative_dominant",
              severity: "medium",
              message: `📉 Negative sentiment dominant for "${topic.title}" with high volatility (${stats.volatility}/100).`,
            });
          }
        }

        results.push({ topic_id: topic.id, title: topic.title, status: "success" });
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : "Unknown error";
        results.push({ topic_id: topic.id, title: topic.title, status: "error", error: errMsg });
      }
    }

    // Log a summary alert
    const successCount = results.filter(r => r.status === "success").length;
    const errorCount = results.filter(r => r.status === "error").length;

    if (errorCount > 0) {
      await supabase.from("alerts").insert({
        alert_type: "scheduled_monitor",
        severity: "low",
        message: `🔄 Scheduled scan complete: ${successCount} topics updated, ${errorCount} failed.`,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      processed: topics.length,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Scheduled monitor error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
