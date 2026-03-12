-- ============================================================
--  FULL MIGRATION — Run this once in Supabase SQL Editor
--  New project: owrqiailcuwlzxeekhms.supabase.co
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ── Enum types ───────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.sentiment_type AS ENUM ('positive', 'negative', 'mixed', 'neutral');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.emotion_type AS ENUM ('joy', 'anger', 'sadness', 'fear', 'surprise', 'disgust');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.platform_type AS ENUM ('x', 'youtube');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.crisis_level_type AS ENUM ('none', 'low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── updated_at trigger function ───────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ── Core tables ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.topics (
  id          UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT    NOT NULL,
  hashtag     TEXT    NOT NULL,
  query       TEXT    NOT NULL,
  platform    public.platform_type DEFAULT 'x',
  is_trending BOOLEAN DEFAULT false,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.posts (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id        UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  platform        public.platform_type NOT NULL,
  external_id     TEXT NOT NULL,
  author          TEXT NOT NULL,
  content         TEXT NOT NULL,
  sentiment       public.sentiment_type,
  primary_emotion public.emotion_type,
  emotion_scores  JSONB DEFAULT '{}'::jsonb,
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  posted_at       TIMESTAMPTZ,
  UNIQUE(platform, external_id)
);

CREATE TABLE IF NOT EXISTS public.topic_stats (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id         UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  total_volume     INTEGER DEFAULT 0,
  volume_change    NUMERIC DEFAULT 0,
  overall_sentiment public.sentiment_type DEFAULT 'neutral',
  crisis_level     public.crisis_level_type DEFAULT 'none',
  volatility       INTEGER DEFAULT 0,
  emotion_breakdown JSONB DEFAULT '[]'::jsonb,
  top_phrases      JSONB DEFAULT '[]'::jsonb,
  ai_summary       TEXT,
  key_takeaways    JSONB DEFAULT '[]'::jsonb,
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alerts (
  id         UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id   UUID REFERENCES public.topics(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  message    TEXT NOT NULL,
  severity   public.crisis_level_type DEFAULT 'low',
  is_read    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sentiment_timeline (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id     UUID REFERENCES public.topics(id) ON DELETE CASCADE,
  positive_pct NUMERIC DEFAULT 0,
  negative_pct NUMERIC DEFAULT 0,
  neutral_pct  NUMERIC DEFAULT 0,
  volume       INTEGER DEFAULT 0,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── User / profile tables ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saved_topics (
  id       UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic_id)
);

CREATE TABLE IF NOT EXISTS public.search_history (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query       TEXT NOT NULL,
  searched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_alert_preferences (
  id                   UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  crisis_threshold     TEXT NOT NULL DEFAULT 'medium',
  emotion_alerts       JSONB NOT NULL DEFAULT '["anger", "fear"]'::jsonb,
  email_notifications  BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── user_topic_preferences (pin / archive / delete / rename) ──

CREATE TABLE IF NOT EXISTS public.user_topic_preferences (
  id           UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id     UUID    NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  is_pinned    BOOLEAN NOT NULL DEFAULT false,
  is_archived  BOOLEAN NOT NULL DEFAULT false,
  is_deleted   BOOLEAN NOT NULL DEFAULT false,
  custom_title TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic_id)
);

-- ── updated_at triggers ───────────────────────────────────────

DROP TRIGGER IF EXISTS update_topics_updated_at ON public.topics;
CREATE TRIGGER update_topics_updated_at
  BEFORE UPDATE ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_alert_preferences_updated_at ON public.user_alert_preferences;
CREATE TRIGGER update_user_alert_preferences_updated_at
  BEFORE UPDATE ON public.user_alert_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_topic_preferences_updated_at ON public.user_topic_preferences;
CREATE TRIGGER update_user_topic_preferences_updated_at
  BEFORE UPDATE ON public.user_topic_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Auto-create profile on signup ────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Enable RLS ────────────────────────────────────────────────

ALTER TABLE public.topics                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_stats             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentiment_timeline      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_topics            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_alert_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_topic_preferences  ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies — public read (dashboard data) ───────────────

DROP POLICY IF EXISTS "Topics are publicly readable"           ON public.topics;
DROP POLICY IF EXISTS "Posts are publicly readable"            ON public.posts;
DROP POLICY IF EXISTS "Topic stats are publicly readable"      ON public.topic_stats;
DROP POLICY IF EXISTS "Alerts are publicly readable"           ON public.alerts;
DROP POLICY IF EXISTS "Timeline is publicly readable"          ON public.sentiment_timeline;

CREATE POLICY "Topics are publicly readable"
  ON public.topics FOR SELECT USING (true);

CREATE POLICY "Posts are publicly readable"
  ON public.posts FOR SELECT USING (true);

CREATE POLICY "Topic stats are publicly readable"
  ON public.topic_stats FOR SELECT USING (true);

CREATE POLICY "Alerts are publicly readable"
  ON public.alerts FOR SELECT USING (true);

CREATE POLICY "Timeline is publicly readable"
  ON public.sentiment_timeline FOR SELECT USING (true);

-- ── RLS Policies — profiles ───────────────────────────────────

DROP POLICY IF EXISTS "Users can view own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ── RLS Policies — saved_topics ───────────────────────────────

DROP POLICY IF EXISTS "Users can view own saved topics" ON public.saved_topics;
DROP POLICY IF EXISTS "Users can save topics"           ON public.saved_topics;
DROP POLICY IF EXISTS "Users can unsave topics"         ON public.saved_topics;

CREATE POLICY "Users can view own saved topics"
  ON public.saved_topics FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save topics"
  ON public.saved_topics FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave topics"
  ON public.saved_topics FOR DELETE USING (auth.uid() = user_id);

-- ── RLS Policies — search_history ────────────────────────────

DROP POLICY IF EXISTS "Users can view own search history"   ON public.search_history;
DROP POLICY IF EXISTS "Users can insert search history"     ON public.search_history;
DROP POLICY IF EXISTS "Users can delete own search history" ON public.search_history;

CREATE POLICY "Users can view own search history"
  ON public.search_history FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert search history"
  ON public.search_history FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own search history"
  ON public.search_history FOR DELETE USING (auth.uid() = user_id);

-- ── RLS Policies — user_alert_preferences ────────────────────

DROP POLICY IF EXISTS "Users can view own alert prefs"   ON public.user_alert_preferences;
DROP POLICY IF EXISTS "Users can insert own alert prefs" ON public.user_alert_preferences;
DROP POLICY IF EXISTS "Users can update own alert prefs" ON public.user_alert_preferences;

CREATE POLICY "Users can view own alert prefs"
  ON public.user_alert_preferences FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alert prefs"
  ON public.user_alert_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alert prefs"
  ON public.user_alert_preferences FOR UPDATE USING (auth.uid() = user_id);

-- ── RLS Policies — user_topic_preferences ────────────────────

DROP POLICY IF EXISTS "Users can view own topic prefs"   ON public.user_topic_preferences;
DROP POLICY IF EXISTS "Users can insert own topic prefs" ON public.user_topic_preferences;
DROP POLICY IF EXISTS "Users can update own topic prefs" ON public.user_topic_preferences;
DROP POLICY IF EXISTS "Users can delete own topic prefs" ON public.user_topic_preferences;

CREATE POLICY "Users can view own topic prefs"
  ON public.user_topic_preferences FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own topic prefs"
  ON public.user_topic_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own topic prefs"
  ON public.user_topic_preferences FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own topic prefs"
  ON public.user_topic_preferences FOR DELETE USING (auth.uid() = user_id);

-- ── Indexes ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_posts_topic_id
  ON public.posts(topic_id);

CREATE INDEX IF NOT EXISTS idx_posts_fetched_at
  ON public.posts(fetched_at DESC);

CREATE INDEX IF NOT EXISTS idx_topic_stats_topic_id
  ON public.topic_stats(topic_id);

CREATE INDEX IF NOT EXISTS idx_sentiment_timeline_recorded
  ON public.sentiment_timeline(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_created
  ON public.alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_topic_prefs_user_id
  ON public.user_topic_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_user_topic_prefs_topic_id
  ON public.user_topic_preferences(topic_id);

-- ── Realtime ──────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.topic_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sentiment_timeline;

-- ── Done ──────────────────────────────────────────────────────
-- All tables, policies, triggers, and indexes have been created.
