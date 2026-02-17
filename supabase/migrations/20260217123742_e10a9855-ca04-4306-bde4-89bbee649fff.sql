
-- Add channel column to cache table
ALTER TABLE public.zendesk_insights_cache ADD COLUMN channel text NOT NULL DEFAULT 'all';

-- Drop old unique constraint
ALTER TABLE public.zendesk_insights_cache DROP CONSTRAINT zendesk_insights_cache_zd_instance_week_start_key;

-- Add new unique constraint including channel
ALTER TABLE public.zendesk_insights_cache ADD CONSTRAINT zendesk_insights_cache_instance_week_channel_key UNIQUE (zd_instance, week_start, channel);

-- Clear existing cached data so it re-fetches with channel awareness
DELETE FROM public.zendesk_insights_cache;
