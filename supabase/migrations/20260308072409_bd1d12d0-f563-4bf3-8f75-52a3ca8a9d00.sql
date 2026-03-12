
-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
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
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Saved topics table
CREATE TABLE public.saved_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic_id)
);

ALTER TABLE public.saved_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved topics" ON public.saved_topics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save topics" ON public.saved_topics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave topics" ON public.saved_topics
  FOR DELETE USING (auth.uid() = user_id);

-- Search history table
CREATE TABLE public.search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  searched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own search history" ON public.search_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert search history" ON public.search_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own search history" ON public.search_history
  FOR DELETE USING (auth.uid() = user_id);

-- User alert preferences
CREATE TABLE public.user_alert_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  crisis_threshold TEXT NOT NULL DEFAULT 'medium',
  emotion_alerts JSONB NOT NULL DEFAULT '["anger", "fear"]'::jsonb,
  email_notifications BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_alert_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alert prefs" ON public.user_alert_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alert prefs" ON public.user_alert_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alert prefs" ON public.user_alert_preferences
  FOR UPDATE USING (auth.uid() = user_id);
