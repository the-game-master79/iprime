-- Drop the trigger causing duplicate distribution
DROP TRIGGER IF EXISTS update_upline_business_trigger ON plans_subscriptions;
DROP FUNCTION IF EXISTS update_upline_business() CASCADE;

-- No need to recreate since we're using direct function call in approve_plan_subscription