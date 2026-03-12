
-- Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Topics are publicly readable" ON public.topics;
CREATE POLICY "Topics are publicly readable" ON public.topics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Topic stats are publicly readable" ON public.topic_stats;
CREATE POLICY "Topic stats are publicly readable" ON public.topic_stats FOR SELECT USING (true);

DROP POLICY IF EXISTS "Posts are publicly readable" ON public.posts;
CREATE POLICY "Posts are publicly readable" ON public.posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Alerts are publicly readable" ON public.alerts;
CREATE POLICY "Alerts are publicly readable" ON public.alerts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Timeline is publicly readable" ON public.sentiment_timeline;
CREATE POLICY "Timeline is publicly readable" ON public.sentiment_timeline FOR SELECT USING (true);
