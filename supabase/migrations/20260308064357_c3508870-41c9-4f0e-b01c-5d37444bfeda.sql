
-- Drop overly permissive write policies
DROP POLICY "Service can manage topics" ON public.topics;
DROP POLICY "Service can manage posts" ON public.posts;
DROP POLICY "Service can manage topic_stats" ON public.topic_stats;
DROP POLICY "Service can manage alerts" ON public.alerts;
DROP POLICY "Service can manage timeline" ON public.sentiment_timeline;

-- Edge functions use service_role key which bypasses RLS entirely,
-- so no write policies are needed for public users.
-- Only SELECT policies remain (public read access).
