-- Array of sample names and countries
create or replace function generate_marquee_data()
returns void
language plpgsql
security definer
as $$
declare
  names text[] := array[
    'John Smith', 'Emma Wilson', 'Michael Brown', 'Sarah Davis', 'James Johnson',
    'Lisa Anderson', 'David Taylor', 'Maria Garcia', 'Robert Martinez', 'Jennifer Lee',
    'William Turner', 'Sophie White', 'Thomas Clark', 'Oliver Lewis', 'Isabella Moore',
    'Lucas Martin', 'Ava Thompson', 'Ethan Wright', 'Mia Rodriguez', 'Noah King',
    'Charlotte Hill', 'Mason Lee', 'Amelia Scott', 'Alexander Hall', 'Harper Green'
    -- Add more names as needed
  ];
  countries text[] := array[
    'US', 'UK', 'CA', 'AU', 'DE', 'FR', 'ES', 'IT', 'JP', 'BR',
    'NL', 'SG', 'AE', 'CH', 'SE', 'NO', 'NZ', 'IE', 'DK', 'FI'
  ];
  random_name text;
  random_country text;
  entries_to_generate int := 200; -- Generate exactly 200 entries
begin
  -- Clean up old entries first
  delete from public.new_users_marquee
  where joined_time < now() - interval '7 days';

  -- Generate new entries
  for i in 1..entries_to_generate loop
    -- Generate a random name by combining first and last names
    random_name := names[floor(random() * array_length(names, 1) + 1)::int];
    random_country := countries[floor(random() * array_length(countries, 1) + 1)::int];
    
    -- Add random minutes to spread out join times
    insert into public.new_users_marquee (name, country, joined_time)
    values (
      random_name, 
      random_country, 
      now() - (random() * interval '24 hours')
    );
  end loop;
end;
$$;

-- Set up cron job to run every 24 hours
select cron.schedule(
  'generate-marquee-data',
  '0 0 * * *', -- Run at midnight every day
  'select generate_marquee_data()'
);

-- Generate initial data
select generate_marquee_data();
