-- user_topic_preferences: per-user pin / archive / soft-delete / rename
CREATE TABLE public.user_topic_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  custom_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic_id)
);

ALTER TABLE public.user_topic_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own topic prefs"
  ON public.user_topic_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own topic prefs"
  ON public.user_topic_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own topic prefs"
  ON public.user_topic_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own topic prefs"
  ON public.user_topic_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Reuse the existing updated_at trigger function
CREATE TRIGGER update_user_topic_preferences_updated_at
  BEFORE UPDATE ON public.user_topic_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast per-user lookups
CREATE INDEX idx_user_topic_prefs_user_id
  ON public.user_topic_preferences(user_id);

CREATE INDEX idx_user_topic_prefs_topic_id
  ON public.user_topic_preferences(topic_id);
