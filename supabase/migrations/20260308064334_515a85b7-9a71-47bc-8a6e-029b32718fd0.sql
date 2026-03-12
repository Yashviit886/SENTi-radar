
-- Create enum types
CREATE TYPE public.sentiment_type AS ENUM ('positive', 'negative', 'mixed', 'neutral');
CREATE TYPE public.emotion_type AS ENUM ('joy', 'anger', 'sadness', 'fear', 'surprise', 'disgust');
CREATE TYPE public.platform_type AS ENUM ('x', 'youtube');
CREATE TYPE public.crisis_level_type AS ENUM ('none', 'low', 'medium', 'high');

-- Topics table
CREATE TABLE public.topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  hashtag TEXT NOT NULL,
  query TEXT NOT NULL,
  platform platform_type DEFAULT 'x',
  is_trending BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Posts table (raw social media posts)
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
  platform platform_type NOT NULL,
  external_id TEXT NOT NULL,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  sentiment sentiment_type,
  primary_emotion emotion_type,
  emotion_scores JSONB DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  posted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(platform, external_id)
);

-- Topic sentiment aggregates (updated periodically)
CREATE TABLE public.topic_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
  total_volume INTEGER DEFAULT 0,
  volume_change NUMERIC DEFAULT 0,
  overall_sentiment sentiment_type DEFAULT 'neutral',
  crisis_level crisis_level_type DEFAULT 'none',
  volatility INTEGER DEFAULT 0,
  emotion_breakdown JSONB DEFAULT '[]'::jsonb,
  top_phrases JSONB DEFAULT '[]'::jsonb,
  ai_summary TEXT,
  key_takeaways JSONB DEFAULT '[]'::jsonb,
  computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Alerts table
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity crisis_level_type DEFAULT 'low',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sentiment timeline (for charting)
CREATE TABLE public.sentiment_timeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
  positive_pct NUMERIC DEFAULT 0,
  negative_pct NUMERIC DEFAULT 0,
  neutral_pct NUMERIC DEFAULT 0,
  volume INTEGER DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentiment_timeline ENABLE ROW LEVEL SECURITY;

-- Public read access (this is a public dashboard)
CREATE POLICY "Topics are publicly readable" ON public.topics FOR SELECT USING (true);
CREATE POLICY "Posts are publicly readable" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Topic stats are publicly readable" ON public.topic_stats FOR SELECT USING (true);
CREATE POLICY "Alerts are publicly readable" ON public.alerts FOR SELECT USING (true);
CREATE POLICY "Timeline is publicly readable" ON public.sentiment_timeline FOR SELECT USING (true);

-- Service role can insert/update (edge functions use service role)
CREATE POLICY "Service can manage topics" ON public.topics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service can manage posts" ON public.posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service can manage topic_stats" ON public.topic_stats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service can manage alerts" ON public.alerts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service can manage timeline" ON public.sentiment_timeline FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_posts_topic_id ON public.posts(topic_id);
CREATE INDEX idx_posts_fetched_at ON public.posts(fetched_at DESC);
CREATE INDEX idx_topic_stats_topic_id ON public.topic_stats(topic_id);
CREATE INDEX idx_sentiment_timeline_recorded ON public.sentiment_timeline(recorded_at DESC);
CREATE INDEX idx_alerts_created ON public.alerts(created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.topic_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sentiment_timeline;

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_topics_updated_at
  BEFORE UPDATE ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
