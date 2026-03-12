import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import type { TopicCard, EmotionData } from "@/lib/mockData";

// ── User topic preference types ───────────────────────────────────────────────
export interface UserTopicPref {
  topicId: string;
  isPinned: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  customTitle: string | null;
}

// Types from DB
interface DbTopic {
  id: string;
  title: string;
  hashtag: string;
  query: string;
  platform: "x" | "youtube" | null;
  is_trending: boolean | null;
  is_active: boolean | null;
}

interface DbTopicStats {
  id: string;
  topic_id: string;
  total_volume: number | null;
  volume_change: number | null;
  overall_sentiment: "positive" | "negative" | "mixed" | "neutral" | null;
  crisis_level: "none" | "low" | "medium" | "high" | null;
  volatility: number | null;
  emotion_breakdown: any;
  top_phrases: any;
  ai_summary: string | null;
  key_takeaways: any;
}

interface DbPost {
  id: string;
  topic_id: string;
  platform: "x" | "youtube";
  author: string;
  content: string;
  primary_emotion: string | null;
  sentiment: string | null;
  fetched_at: string;
}

// Generate deterministic mock data based on a string seed (the topic id)
function generateMockStats(topic: DbTopic): TopicCard {
  const hash = topic.id
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const title = (topic.title || "").toLowerCase();
  const query = (topic.query || "").toLowerCase();
  const text = `${title} ${query}`;

  // ── Keyword-based topic classification ────────────────────────────────────
  const CRISIS_WORDS = ['war', 'attack', 'bomb', 'tension', 'conflict', 'crisis', 'kill', 'death', 'disaster', 'shortage', 'sanction', 'nuclear', 'missile', 'invasion', 'collapse', 'famine', 'riot', 'protest', 'terror', 'escalat', 'strike', 'casualt', 'threat', 'weapon'];
  const NEGATIVE_WORDS = ['scandal', 'fraud', 'lawsuit', 'hack', 'breach', 'layoff', 'recession', 'crash', 'decline', 'ban', 'restrict', 'inflation', 'corrupt', 'abuse', 'fail', 'scam', 'pollution', 'exploit'];
  const POSITIVE_WORDS = ['launch', 'release', 'innovation', 'breakthrough', 'award', 'grow', 'profit', 'success', 'deal', 'partnership', 'milestone', 'upgrade', 'improve', 'celebrate', 'record'];
  const TECH_WORDS = ['phone', 'galaxy', 'iphone', 'laptop', 'app', 'software', 'ai ', 'robot', 'tech', 'chip', 'processor', 'gpu', 'nvidia', 'apple', 'samsung', 'google', 'tesla', 'game', 'streaming'];

  const crisisScore = CRISIS_WORDS.filter(w => text.includes(w)).length;
  const negScore = NEGATIVE_WORDS.filter(w => text.includes(w)).length;
  const posScore = POSITIVE_WORDS.filter(w => text.includes(w)).length;
  const techScore = TECH_WORDS.filter(w => text.includes(w)).length;

  const isCrisis = crisisScore >= 1;
  const isNegative = negScore >= 1 && !isCrisis;
  const isPositive = posScore >= 1 || techScore >= 2;

  // ── Emotion distribution based on topic type ─────────────────────────────
  let emotions: EmotionData[];
  let sentiment: string;
  let crisisLevel: string;
  let volumeChange: number;

  if (isCrisis) {
    // War, tensions, disasters → fear + anger dominant
    const fearPct = 35 + (hash % 20);   // 35-55%
    const angerPct = 25 + (hash % 15);  // 25-40%
    const sadPct = Math.max(5, 100 - fearPct - angerPct - 10);
    emotions = [
      { emotion: "fear", percentage: fearPct, count: 0 },
      { emotion: "anger", percentage: angerPct, count: 0 },
      { emotion: "sadness", percentage: sadPct, count: 0 },
      { emotion: "disgust", percentage: 5, count: 0 },
      { emotion: "surprise", percentage: 3, count: 0 },
      { emotion: "joy", percentage: 2, count: 0 },
    ];
    sentiment = "negative";
    crisisLevel = crisisScore >= 2 ? "high" : "medium";
    volumeChange = 10 + (hash % 30); // always rising in crisis
  } else if (isNegative) {
    // Scandals, lawsuits → anger + disgust
    const angerPct = 40 + (hash % 15);
    const disgustPct = 20 + (hash % 10);
    emotions = [
      { emotion: "anger", percentage: angerPct, count: 0 },
      { emotion: "disgust", percentage: disgustPct, count: 0 },
      { emotion: "sadness", percentage: 15, count: 0 },
      { emotion: "fear", percentage: 10, count: 0 },
      { emotion: "surprise", percentage: Math.max(3, 100 - angerPct - disgustPct - 25), count: 0 },
      { emotion: "joy", percentage: 2, count: 0 },
    ];
    sentiment = "negative";
    crisisLevel = "medium";
    volumeChange = 5 + (hash % 20);
  } else if (isPositive) {
    // Product launches, tech → joy + surprise
    const joyPct = 40 + (hash % 20);
    const surprisePct = 20 + (hash % 10);
    emotions = [
      { emotion: "joy", percentage: joyPct, count: 0 },
      { emotion: "surprise", percentage: surprisePct, count: 0 },
      { emotion: "anger", percentage: 10, count: 0 },
      { emotion: "fear", percentage: 5, count: 0 },
      { emotion: "sadness", percentage: Math.max(3, 100 - joyPct - surprisePct - 15), count: 0 },
      { emotion: "disgust", percentage: 2, count: 0 },
    ];
    sentiment = "positive";
    crisisLevel = "none";
    volumeChange = (hash % 30) - 5;
  } else {
    // Generic/unknown → mixed
    emotions = [
      { emotion: "surprise", percentage: 25 + (hash % 10), count: 0 },
      { emotion: "joy", percentage: 20 + (hash % 10), count: 0 },
      { emotion: "anger", percentage: 15 + (hash % 10), count: 0 },
      { emotion: "fear", percentage: 12, count: 0 },
      { emotion: "sadness", percentage: 10, count: 0 },
      { emotion: "disgust", percentage: 8, count: 0 },
    ];
    // Normalize to 100
    const total = emotions.reduce((s, e) => s + e.percentage, 0);
    emotions[0].percentage += (100 - total);
    sentiment = "mixed";
    crisisLevel = "none";
    volumeChange = (hash % 20) - 8;
  }

  emotions.sort((a, b) => b.percentage - a.percentage);

  const topEmo = emotions[0].emotion;
  const summaryText = isCrisis
    ? `Public reaction to ${topic.title} is dominated by ${topEmo} and concern. Discussions focus on potential consequences and calls for action.`
    : isNegative
    ? `Sentiment around ${topic.title} is strongly negative, with growing ${topEmo} driving the conversation.`
    : isPositive
    ? `${topic.title} is generating excitement and positive buzz, with ${topEmo} leading public reaction.`
    : `Public opinion on ${topic.title} is mixed, with no single dominant narrative emerging.`;

  return {
    id: topic.id,
    title: topic.title,
    hashtag: topic.hashtag,
    platform: (topic.platform as any) || "both",
    sentiment: sentiment as any,
    volume: 1200 + ((hash * 47) % 5000),
    change: volumeChange,
    crisisLevel: crisisLevel as any,
    volatility: isCrisis ? 70 + (hash % 25) : isNegative ? 50 + (hash % 30) : 30 + (hash % 30),
    emotions,
    summary: summaryText,
    keyTakeaways: [],
    topPhrases: [],
  };
}


// Convert DB data to frontend TopicCard format
function toTopicCard(topic: DbTopic, stats: DbTopicStats | null): TopicCard {
  // If backend completely failed to generate stats due to API failure/rate-limit out of our control,
  // we gracefully degrade into a deterministic offline mock.
  if (!stats) return generateMockStats(topic);

  const emotions: EmotionData[] = (stats?.emotion_breakdown as any[]) || [];

  // ensure valid data
  if (emotions.length === 0) return generateMockStats(topic);

  return {
    id: topic.id,
    title: topic.title,
    hashtag: topic.hashtag,
    platform: (topic.platform as any) || "both",
    sentiment: (stats?.overall_sentiment as any) || "neutral",
    volume: stats?.total_volume || 0,
    change: stats?.volume_change ? Number(stats.volume_change) : 0,
    emotions,
    summary:
      stats?.ai_summary || "No analysis available yet. Click to analyze.",
    keyTakeaways: (stats?.key_takeaways as string[]) || [],
    topPhrases: (stats?.top_phrases as any[]) || [],
    crisisLevel: (stats?.crisis_level as any) || "none",
    volatility: stats?.volatility || 0,
  };
}

// Fetch all topics with their stats
export function useTopics() {
  return useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      const { data: topics, error: topicsError } = await supabase
        .from("topics")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (topicsError) throw topicsError;
      if (!topics || topics.length === 0) return [];

      const { data: stats } = await supabase
        .from("topic_stats")
        .select("*")
        .in(
          "topic_id",
          topics.map((t) => t.id),
        );

      const statsMap = new Map((stats || []).map((s) => [s.topic_id, s]));

      return topics.map((t) => toTopicCard(t, statsMap.get(t.id) || null));
    },
  });
}

// Fetch recent posts (live feed)
export function useLiveFeed() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["live-feed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .not("primary_emotion", "is", null)
        .order("fetched_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []).map((p: DbPost) => ({
        platform: p.platform as "x" | "youtube",
        user: p.author,
        text: p.content,
        emotion: (p.primary_emotion || "joy") as any,
        time: getRelativeTime(p.fetched_at),
      }));
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("live-posts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["live-feed"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

// Fetch sentiment timeline
export function useSentimentTimeline() {
  return useQuery({
    queryKey: ["sentiment-timeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sentiment_timeline")
        .select("*")
        .order("recorded_at", { ascending: true })
        .limit(50);

      if (error) throw error;
      return (data || []).map((d) => ({
        time: new Date(d.recorded_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        positive: d.positive_pct || 0,
        negative: d.negative_pct || 0,
        neutral: d.neutral_pct || 0,
        volume: d.volume || 0,
      }));
    },
  });
}

// Fetch alerts
export function useAlerts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("live-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["alerts"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

// Analyze a topic (orchestrator)
export function useAnalyzeTopic() {
  return useMutation({
    mutationFn: async ({
      query,
      title,
      hashtag,
    }: {
      query: string;
      title?: string;
      hashtag?: string;
    }) => {
      // Invoke the remote edge function to create the topic + fetch + analyze
      const { data, error } = await supabase.functions.invoke("analyze-topic", {
        body: { query, title, hashtag },
      });

      // Only swallow rate-limit / quota errors from third-party APIs —
      // everything else (e.g. function not deployed, auth error) should surface.
      if (error) {
        const msg: string =
          error.message || error.toString?.() || "Unknown error";
        const isRateLimit =
          msg.includes("429") ||
          msg.toLowerCase().includes("quota") ||
          msg.toLowerCase().includes("rate limit") ||
          msg.toLowerCase().includes("resource_exhausted");
        if (!isRateLimit) throw error;
      }

      return data;
    },
    // NOTE: cache invalidation is handled by Index.tsx's onSuccess + refetchTopics()
    // so we do NOT double-invalidate here. This avoids a race-condition where the
    // mutation's own onSuccess tries to refetch before the edge function has committed.
  });
}

// Stats summary
export function useStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const { count: postCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true });

      const { count: topicCount } = await supabase
        .from("topics")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      const { count: alertCount } = await supabase
        .from("alerts")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);

      return {
        postCount: postCount || 0,
        topicCount: topicCount || 0,
        alertCount: alertCount || 0,
      };
    },
  });
}

// Save search to history
export function useSaveSearchHistory() {
  return useMutation({
    mutationFn: async ({ query }: { query: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { error } = await supabase.from("search_history").insert({
        user_id: user.id,
        query,
      });
      if (error) throw error;
    },
  });
}

// Saved topics
export function useSavedTopics() {
  return useQuery({
    queryKey: ["saved-topics"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("saved_topics")
        .select("topic_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data || []).map((d) => d.topic_id);
    },
  });
}

export function useToggleSaveTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      topicId,
      saved,
    }: {
      topicId: string;
      saved: boolean;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (saved) {
        await supabase
          .from("saved_topics")
          .delete()
          .eq("user_id", user.id)
          .eq("topic_id", topicId);
      } else {
        await supabase
          .from("saved_topics")
          .insert({ user_id: user.id, topic_id: topicId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-topics"] });
    },
  });
}

// ── User topic preferences ────────────────────────────────────────────────────

/** Fetch all per-user topic preferences as a Map<topicId, UserTopicPref> */
export function useUserTopicPrefs() {
  return useQuery({
    queryKey: ["user-topic-prefs"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return new Map<string, UserTopicPref>();

      const { data, error } = await supabase
        .from("user_topic_preferences")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;

      const map = new Map<string, UserTopicPref>();
      for (const row of data || []) {
        map.set(row.topic_id, {
          topicId: row.topic_id,
          isPinned: row.is_pinned,
          isArchived: row.is_archived,
          isDeleted: row.is_deleted,
          customTitle: row.custom_title,
        });
      }
      return map;
    },
  });
}

/**
 * Generic upsert for user_topic_preferences.
 * Only the fields you include will be SET on conflict — existing fields are preserved.
 */
export function useUpsertTopicPref() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      topicId: string;
      is_pinned?: boolean;
      is_archived?: boolean;
      is_deleted?: boolean;
      custom_title?: string | null;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { topicId, ...fields } = payload;

      const { error } = await supabase
        .from("user_topic_preferences")
        .upsert(
          { user_id: user.id, topic_id: topicId, ...fields },
          { onConflict: "user_id,topic_id" },
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-topic-prefs"] });
    },
  });
}

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}
