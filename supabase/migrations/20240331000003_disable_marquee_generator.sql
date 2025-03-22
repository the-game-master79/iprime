-- Disable and remove the cron job
select cron.unschedule('generate-marquee-data');

-- Delete all entries from new_users_marquee
truncate table public.new_users_marquee;

-- Drop the function (optional - uncomment if you want to remove it completely)
-- drop function if exists generate_marquee_data();
